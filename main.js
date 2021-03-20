var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var triangleSide = 100;
var maxZ = triangleSide * 4;
var mouseZ = triangleSide * 6;
var growthPerSecond = maxZ * 0.3;
var effectSize = 0.3;
var minDist = mouseZ - maxZ;
var maxDist = mouseZ;
var kExp = 1;
var MExp = 1;
var effectArea = 0;
var windowHeight = 100;
var windowWidth = 100;
var SQRT3_2 = Math.sqrt(3) / 2;
var between = function (min, max) { return min + (max - min) * Math.random(); };
//[y][x]
var points = [];
var getPoint = function (i, j) { return points[i] ? points[i][j] : undefined; };
var mapPoints = function (fn) {
    for (var i = 0; i < points.length; i++) {
        for (var j = 0; j < points[i].length; j++) {
            fn(i, j, points[i][j]);
        }
    }
};
var getTriangles = function () {
    var t = [];
    mapPoints(function (i, j, point) {
        var j_ = i % 2 ? j - 1 : j;
        var left = getPoint(i, j - 1);
        var upLeft = getPoint(i - 1, j_);
        var upRight = getPoint(i - 1, j_ + 1);
        if (left && upLeft) {
            t.push([point, left, upLeft]);
        }
        if (upLeft && upRight) {
            t.push([point, upLeft, upRight]);
        }
    });
    return t;
};
var sum = function (n) { return n.reduce(function (acc, val) { return acc + val; }, 0); };
var approxCenter = function (points) { return [
    sum(points.map(function (p) { return p[0]; })) / points.length,
    sum(points.map(function (p) { return p[1]; })) / points.length,
    sum(points.map(function (p) { return p[2]; })) / points.length
]; };
var normalizeVector = function (v) {
    var length = calculateDist(v, [0, 0, 0]);
    return resizeVector(v, 1 / length);
};
var dotProduct = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
var normalizedCrossProduct = function (a, b) { return normalizeVector([
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
]); };
var middlePoint = function (a, b, ratio) {
    if (ratio === void 0) { ratio = 0.5; }
    return sumVectors(resizeVector(a, ratio), resizeVector(b, 1 - ratio));
};
var connectorVector = function (a, b) { return sumVectors(b, resizeVector(a, -1)); };
var sumVectors = function (a, b) { return [
    a[0] + b[0],
    a[1] + b[1],
    a[2] + b[2],
]; };
var resizeVector = function (a, k) { return [
    a[0] * k,
    a[1] * k,
    a[2] * k,
]; };
var normalizedConnector = function (a, b) { return normalizeVector(connectorVector(a, b)); };
var calculateDist = function (a, b, ignoreZ) {
    if (ignoreZ === void 0) { ignoreZ = false; }
    return Math.sqrt(Math.pow((a[0] - b[0]), 2) +
        Math.pow((a[1] - b[1]), 2) +
        (ignoreZ ? 0 : Math.pow((a[2] - b[2]), 2)));
};
var clamp = function (v, min, max) { return Math.min(max, Math.max(v, min)); };
var makeGradientPoints = function (p) {
    var sorted = __spreadArray([], p).sort(function (a, b) { return a[2] - b[2]; });
    var minZT = sorted[0][2];
    var midZT = sorted[1][2];
    var maxZT = sorted[2][2];
    if ((maxZT - minZT) < maxZ * 0.01) {
        return minZT / maxZ;
    }
    var midClose2Min = (maxZT - midZT) / (maxZT - minZT);
    var midClose2Max = 1 - midClose2Min;
    var lowPoint = middlePoint(sorted[0], sorted[1], 1 - midClose2Min / 2);
    var higPoint = middlePoint(sorted[2], sorted[1], 1 - midClose2Max / 2);
    var vector = connectorVector(lowPoint, higPoint);
    var lowVal = lowPoint[2] / maxZ;
    var highVal = higPoint[2] / maxZ;
    var diff = highVal - lowVal;
    if (diff < 0.01) {
        return lowVal;
    }
    var gradientTop = sumVectors(higPoint, resizeVector(vector, (1 - highVal) / diff));
    var gradientBottom = sumVectors(lowPoint, resizeVector(vector, (-lowVal) / diff));
    return [gradientBottom, gradientTop];
};
var colors = {
    sea: [62, 170, 247],
    beach: [250, 238, 177],
    grass: [50, 133, 63],
    rock: [134, 135, 135],
    snow: [255, 255, 255]
};
var sea = [62, 170, 247];
var colorStops = [
    [0, colors.sea],
    [0.05, colors.sea],
    [0.06, colors.beach],
    [0.1, colors.beach],
    [0.15, colors.grass],
    [0.5, colors.grass],
    [0.7, colors.rock],
    [0.9, colors.rock],
    [1, colors.snow],
];
var color2string = function (c) { return "rgb(" + c.map(function (num) { return clamp(Math.round(num), 0, 255); }).join(",") + ")"; };
var makeGradient = function (ctx, t, lightness) {
    var minLightness = 0.3;
    lightness = minLightness + (1 - minLightness) * lightness;
    var pts = makeGradientPoints(t);
    if (typeof pts === "number") {
        var singleColor = colorStops[colorStops.length - 1][1];
        for (var i = 0; i < colorStops.length; i++) {
            var nextColorStop = colorStops[i];
            if (pts < nextColorStop[0]) {
                if (i > 0) {
                    var prevColorStop = colorStops[i - 1];
                    var closeToNext = (pts - prevColorStop[0]) / (nextColorStop[0] - prevColorStop[0]);
                    singleColor = middlePoint(nextColorStop[1], prevColorStop[1], closeToNext);
                }
                else {
                    singleColor = colorStops[0][1];
                }
                break;
            }
        }
        return color2string(resizeVector(singleColor, lightness));
    }
    var gradient = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
    for (var _i = 0, colorStops_1 = colorStops; _i < colorStops_1.length; _i++) {
        var c = colorStops_1[_i];
        gradient.addColorStop(c[0], color2string(resizeVector(c[1], lightness)));
    }
    return gradient;
};
var getMousePositionFromCenter = function () {
    if (!mouse) {
        return { x: 0, y: 0 };
    }
    var x = (mouse[0] - windowWidth / 2) / windowWidth;
    var y = (mouse[1] - windowHeight / 2) / windowHeight;
    return { x: x, y: y };
};
var isometricAdjust = function (p) {
    if (!mouse) {
        return p;
    }
    var pos = getMousePositionFromCenter();
    var yAdjustment = pos.y * p[2] / maxZ;
    var xAdjustment = pos.x * p[2] / maxZ;
    return [p[0] - triangleSide * xAdjustment, p[1] - triangleSide * yAdjustment, p[2]];
};
var draw3angle = function (ctx, t) {
    if (!mouse) {
        return;
    }
    var center = approxCenter(t);
    var distance = calculateDist(center, mouse);
    var toLight = normalizedConnector(center, mouse);
    var surfaceNorm = normalizedCrossProduct(connectorVector(t[1], t[0]), connectorVector(t[2], t[0]));
    var dot = clamp(dotProduct(toLight, surfaceNorm), 0, 1);
    var lightness = MExp * Math.pow(kExp, distance) * dot;
    var ti = t.map(isometricAdjust);
    var gradient = makeGradient(ctx, ti, lightness);
    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.moveTo(ti[0][0], ti[0][1]);
    ctx.lineTo(ti[1][0], ti[1][1]);
    ctx.lineTo(ti[2][0], ti[2][1]);
    ctx.fill();
    // ctx.stroke();
};
var context;
function init() {
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    maxDist = Math.max(windowWidth, windowHeight);
    // effectArea = d;
    effectArea = clamp(Math.min(windowWidth, windowHeight) * effectSize, 2 * triangleSide, maxDist);
    kExp = Math.pow(0.5, 1 / (maxDist - minDist));
    MExp = 1 / (Math.pow(kExp, minDist));
    // console.log(0.5, kExp, MExp);
    // return;
    var c = document.getElementById("bg");
    if (!c || c.tagName.toLowerCase() !== "canvas") {
        return;
    }
    c.removeEventListener("mouseout", stopGrowth);
    c.addEventListener("mouseout", stopGrowth);
    c.removeEventListener("mouseenter", startGrowth);
    c.addEventListener("mouseenter", startGrowth);
    context = c.getContext("2d");
    c.width = windowWidth;
    c.height = windowHeight;
    var xs = Math.round(windowWidth / triangleSide);
    var dx = windowWidth / xs;
    var ys = Math.round(windowHeight / (triangleSide * SQRT3_2) * 2);
    var dy = windowWidth / ys;
    points = [];
    for (var i = 0; i <= ys; i++) {
        points[i] = [];
        for (var j = -1; j <= xs; j++) {
            var yTol = (i <= 0 || i >= (ys - 1)) ? 0 : 0.1;
            var xTol = (j <= 0 || j >= (xs - 1)) ? 0 : 0.1;
            var x = dx * (j + between(-xTol, xTol) + (i % 2 ? 0 : 0.5));
            var y = dy * (i + between(-yTol, yTol));
            points[i][j] = [x, y, 0];
        }
    }
    drawAll();
}
function drawAll() {
    if (!mouse || !points.length || !context) {
        return;
    }
    var triangles = getTriangles();
    for (var _i = 0, triangles_1 = triangles; _i < triangles_1.length; _i++) {
        var t = triangles_1[_i];
        draw3angle(context, t);
    }
}
var mouse;
var drawn = false;
var moveListener = function (e) {
    mouse = [e.clientX, e.clientY, mouseZ];
    requestAnimationFrame(drawAll);
};
document.addEventListener("mousemove", moveListener);
var prevMin = 0;
var prevAvg = 0;
var then = 0;
function changeHeights() {
    var redoCycle = function () { return requestAnimationFrame(changeHeights); };
    if (!running || !mouse) {
        return redoCycle();
    }
    if (!then) {
        then = performance.now();
        return redoCycle();
    }
    var now = performance.now();
    var diffSeconds = (now - then) / 1000;
    if (diffSeconds < 0.01) {
        return redoCycle();
    }
    var growth = growthPerSecond * diffSeconds;
    var nextMin = maxZ;
    var sumZ = 0;
    var pointsCount = points.length * points[0].length;
    mapPoints(function (i, j, point) {
        var z = point[2] - prevMin - prevAvg * effectSize * 0.5;
        var distance = calculateDist(mouse, point, true);
        z += growth * clamp((1 - distance * 1 / effectArea), 0, 1);
        point[2] = clamp(z, 0, maxZ);
        nextMin = Math.min(nextMin, point[2]);
        sumZ += point[2];
    });
    prevMin = nextMin;
    prevAvg = sumZ / pointsCount;
    then = now;
    // stopGrowth();
    requestAnimationFrame(drawAll);
    return redoCycle();
}
var interval = 0;
var running = false;
function startGrowth() {
    stopGrowth();
    running = true;
    if (!interval) {
        interval = requestAnimationFrame(changeHeights);
    }
}
function stopGrowth() {
    running = false;
    then = 0;
    if (interval) {
        cancelAnimationFrame(interval);
        interval = 0;
    }
}
startGrowth();
init();
window.addEventListener("resize", init);
// window.addEventListener("mousedown", startGrowth);
// window.addEventListener("mouseup", stopGrowth);
