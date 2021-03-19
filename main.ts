const triangleSide = 100;

const maxZ = triangleSide * 4;
const mouseZ = triangleSide * 6;

const growthPerSecond = maxZ * 0.3;
const effectSize = 0.3;

const minDist = mouseZ - maxZ;
let maxDist = mouseZ;
let kExp = 1;
let MExp = 1;
let effectArea = 0;
let windowHeight = 100;
let windowWidth = 100;

const SQRT3_2 = Math.sqrt(3) / 2;

const between = (min: number, max: number): number => min + (max - min) * Math.random();
type Point = [x: number, y: number, z: number];
//[y][x]
let points: Point[][] = [];
const getPoint = (i: number, j: number): Point | undefined => points[i] ? points[i][j] : undefined;

const mapPoints = (fn: (i: number, j: number, point: Point) => void) => {
  for (let i = 0; i < points.length; i++) {
    for (let j = 0; j < points[i].length; j++) {
      fn(i, j, points[i][j]);
    }
  }
}

type Triangle = [Point, Point, Point];
const getTriangles = (): Triangle[] => {
  const t: Triangle[] = [];
  mapPoints((i, j, point) => {
    const j_ = i % 2 ? j - 1 : j;
    const left = getPoint(i, j - 1);
    const upLeft = getPoint(i - 1, j_);
    const upRight = getPoint(i - 1, j_ + 1);
    if (left && upLeft) {
      t.push([point, left, upLeft]);
    }
    if (upLeft && upRight) {
      t.push([point, upLeft, upRight]);
    }
  });
  return t;
}

const sum = (n: number[]) => n.reduce((acc, val) => acc + val, 0);
const approxCenter = (points: Point[]): Point => [
  sum(points.map((p) => p[0])) / points.length,
  sum(points.map((p) => p[1])) / points.length,
  sum(points.map((p) => p[2])) / points.length
];
const normalizeVector = (v: Point): Point => {
  const length = calculateDist(v, [0, 0, 0]);
  return resizeVector(v, 1 / length);
}
const dotProduct = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalizedCrossProduct = (a: Point, b: Point) => normalizeVector([
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]);
const middlePoint = (a: Point, b: Point, ratio = 0.5): Point => 
  sumVectors(resizeVector(a, ratio), resizeVector(b, 1 - ratio))
;
const connectorVector = (a: Point, b: Point): Point => sumVectors(b, resizeVector(a, -1));
const sumVectors = (a: Point, b: Point): Point => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
]
const resizeVector = (a: Point, k: number): Point => [
  a[0] * k,
  a[1] * k,
  a[2] * k,
];
const normalizedConnector = (a: Point, b: Point) => normalizeVector(connectorVector(a, b));
const calculateDist = (a: Point, b: Point, ignoreZ = false) => Math.sqrt(
  (a[0] - b[0])**2 +
  (a[1] - b[1])**2 +
  (ignoreZ ? 0 : (a[2] - b[2])**2)
);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(v, min));

let debugString = "";
const setDebug = (...params: any) => debugString = JSON.stringify(params.length === 1 ? params[0] : params);
function debug() {
  console.log(debugString);
}

const makeGradientPoints = (p: Triangle): [Point, Point] | number => {
  const sorted = [...p].sort((a, b) => a[2] - b[2]) as [Point, Point, Point];
  const minZT = sorted[0][2];
  const midZT = sorted[1][2];
  const maxZT = sorted[2][2];
  if ((maxZT - minZT) < maxZ * 0.01) {
    return minZT / maxZ;
  }
  const midClose2Min = (maxZT - midZT) / (maxZT - minZT);
  const midClose2Max = 1 - midClose2Min;
  const lowPoint = middlePoint(sorted[0], sorted[1], 1 - midClose2Min / 2);
  const higPoint = middlePoint(sorted[2], sorted[1], 1 - midClose2Max / 2);
  const vector = connectorVector(lowPoint, higPoint);
  const lowVal = lowPoint[2] / maxZ;
  const highVal = higPoint[2] / maxZ;
  const diff = highVal - lowVal;
  if (diff < 0.01) {
    return lowVal;
  }
  const gradientTop = sumVectors(higPoint, resizeVector(vector, (1 - highVal) / diff));
  const gradientBottom = sumVectors(lowPoint, resizeVector(vector, ( - lowVal) / diff));
  // const gradientTop = sumVectors(lowPoint, resizeVector(vector, (1 - lowVal) / diff));
  // const gradientBottom = sumVectors(higPoint, resizeVector(vector, (highVal - 1) / diff));
  // if (highVal === 1) {
  //   setDebug({sorted, lowPoint, higPoint, gradientBottom, gradientTop});

  // }
  return [gradientBottom, gradientTop];
}
// type Color = [number, number, number];
type Color = Point;
type ColorStop = [number, Color];
const colors = {
  sea: [62, 170, 247] as Color,
  beach: [250, 238, 177] as Color,
  grass: [50, 133, 63] as Color,
  rock: [134, 135, 135] as Color,
  snow: [255, 255, 255] as Color,
};
const sea = [62, 170, 247]
const colorStops: ColorStop[] = [
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
const color2string = (c: Color): string => "rgb(" + c.map((num) => clamp(Math.round(num), 0, 255)).join(",") + ")";
const makeGradient = (ctx: CanvasRenderingContext2D, t: Triangle, lightness: number): CanvasGradient | string => {
  const minLightness = 0.3;
  lightness = minLightness + (1 - minLightness) * lightness;
  const pts = makeGradientPoints(t);
  if (typeof pts === "number") {
    let singleColor = colorStops[colorStops.length - 1][1];
    for (let i = 0; i < colorStops.length; i++) {
      const nextColorStop = colorStops[i];
      if (pts < nextColorStop[0]) {
        if (i > 0) {
          const prevColorStop = colorStops[i - 1];
          const closeToNext = (pts - prevColorStop[0]) / (nextColorStop[0] - prevColorStop[0]);
          singleColor = middlePoint(nextColorStop[1], prevColorStop[1], closeToNext);
        } else {
          singleColor = colorStops[0][1];
        }
        break;
      }
    }
    return color2string(resizeVector(singleColor, lightness));
  }
  var gradient = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
  for (const c of colorStops) {
    gradient.addColorStop(c[0], color2string(resizeVector(c[1], lightness)));
  }
  return gradient;
}

const getMousePositionFromCenter = () => {
  if (!mouse) {
    return {x: 0, y: 0};
  }
  const x = (mouse[0] - windowWidth / 2) / windowWidth;
  const y = (mouse[1] - windowHeight / 2) / windowHeight;
  return {x, y};
}

const isometricAdjust = (p: Point): Point => {
  if (!mouse) {
    return p;
  }
  const pos = getMousePositionFromCenter();
  const yAdjustment = pos.y * p[2] / maxZ;
  const xAdjustment = pos.x * p[2] / maxZ;
  return [p[0] - triangleSide * xAdjustment, p[1] - triangleSide * yAdjustment, p[2]];
};
const draw3angle = (ctx: CanvasRenderingContext2D, t: Triangle) => {
  if (!mouse) {
    return;
  }
  const center = approxCenter(t);
  const distance = calculateDist(center, mouse);
  const toLight = normalizedConnector(center, mouse);
  const surfaceNorm = normalizedCrossProduct(connectorVector(t[1], t[0]), connectorVector(t[2], t[0]));
  const dot = clamp(dotProduct(toLight, surfaceNorm), 0, 1);
  const lightness = MExp * Math.pow(kExp, distance) * dot;
  const ti = t.map(isometricAdjust) as Triangle;
  const gradient = makeGradient(ctx, ti, lightness);
  ctx.beginPath();
  ctx.fillStyle = gradient;
  ctx.moveTo(ti[0][0], ti[0][1]);
  ctx.lineTo(ti[1][0], ti[1][1]);
  ctx.lineTo(ti[2][0], ti[2][1]);
  ctx.fill();
  // ctx.stroke();
}

let context: CanvasRenderingContext2D | undefined;

function init() {
  windowWidth = window.innerWidth;
  windowHeight = window.innerHeight;
  maxDist = Math.max(windowWidth, windowHeight);
  // effectArea = d;
  effectArea = clamp(Math.min(windowWidth, windowHeight) * effectSize, 2*triangleSide, maxDist);
  kExp = Math.pow(0.5, 1 / (maxDist - minDist));
  MExp = 1 / (Math.pow(kExp, minDist));
  // console.log(0.5, kExp, MExp);
  // return;

  const c = document.getElementById("bg") as HTMLCanvasElement;
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
  const xs = Math.round(windowWidth / triangleSide);
  const dx = windowWidth / xs;
  const ys = Math.round(windowHeight / (triangleSide * SQRT3_2) * 2);
  const dy = windowWidth / ys;
  points = [];
  for (let i = 0; i <= ys; i++) {
    points[i] = [];
    for (let j = -1; j <= xs; j++) {
      const yTol = (i <= 0 || i >= (ys - 1)) ? 0 : 0.1;
      const xTol = (j <= 0 || j >= (xs - 1)) ? 0 : 0.1;
      const x = dx * (j + between(-xTol, xTol) + (i % 2 ? 0 : 0.5));
      const y = dy * (i + between(-yTol, yTol));
      points[i][j] = [x, y, 0];
    }
  }
  drawAll();
}

function drawAll() {
  if (!mouse || !points.length || !context) {
    return;
  }
  const triangles = getTriangles();
  for (const t of triangles) {
    draw3angle(context, t);
  }
}

let mouse: Point | undefined;
let drawn = false;
const moveListener = (e: MouseEvent) => {
  mouse = [e.clientX, e.clientY, mouseZ];
  requestAnimationFrame(drawAll);
};
document.addEventListener("mousemove", moveListener);
let prevMin = 0;
let prevAvg = 0;
let then = 0;

function changeHeights() {
  if (!mouse) {
    return;
  }
  if (!then) {
    then = performance.now();
    return;
  }
  const now = performance.now();
  const diffSeconds = (now - then) / 1000;
  const growth = growthPerSecond * diffSeconds;
  let nextMin = maxZ;
  let sumZ = 0;
  const pointsCount = points.length * points[0].length;
  mapPoints((i, j, point) => {
    let z = point[2] - prevMin - prevAvg * effectSize * 0.5;
    const distance = calculateDist(mouse, point, true);
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
}
let interval: ReturnType<typeof setInterval> = 0;
function startGrowth() {
  stopGrowth();
  interval = setInterval(changeHeights, 100);
}
function stopGrowth() {
  then = 0;
  if (interval) {
    clearInterval(interval);
    interval = 0;
  }
}
startGrowth();

init();
window.addEventListener("resize", init);
// window.addEventListener("mousedown", startGrowth);
// window.addEventListener("mouseup", stopGrowth);