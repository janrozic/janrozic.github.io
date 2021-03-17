const d = 100;

const maxZ = d * 4;
const mouseZ = d * 6;

const minDist = mouseZ - maxZ;
let maxDist = mouseZ;
let kExp = 1;
let MExp = 1;
let effectArea = 0;

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
  return [
    v[0] / length,
    v[1] / length,
    v[2] / length,
  ];
}
const dotProduct = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] + b[2];
const normalizedCrossProduct = (a: Point, b: Point) => normalizeVector([
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]);
const connectorVector = (a: Point, b: Point): Point => [
  b[0] - a[0],
  b[1] - a[1],
  b[2] - a[2],
];
const normalizedConnector = (a: Point, b: Point) => normalizeVector(connectorVector(a, b));
const calculateDist = (a: Point, b: Point, ignoreZ = false) => Math.sqrt(
  (a[0] - b[0])**2 +
  (a[1] - b[1])**2 +
  (ignoreZ ? 0 : (a[2] - b[2])**2)
);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(v, min));

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
  const colorVal = Math.floor(clamp(lightness, 0, 1) * (255 - 50)) + 50;
  // const color = "rgb(" + colorVal + "," + colorVal + "," + colorVal + ")";
  ctx.beginPath();
  ctx.fillStyle = "rgb(" + colorVal + "," + colorVal + "," + colorVal + ")";
  // ctx.strokeStyle = '#CCCCCC';
  ctx.moveTo(t[0][0], t[0][1]);
  ctx.lineTo(t[1][0], t[1][1]);
  ctx.lineTo(t[2][0], t[2][1]);
  ctx.fill();
  // ctx.stroke();
}

let context: CanvasRenderingContext2D | undefined;

function init() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  maxDist = Math.max(w, h);
  effectArea = clamp(Math.min(w, h) * 0.33, 2*d, maxDist);
  kExp = Math.pow(0.5, 1 / (maxDist - minDist));
  MExp = 1 / (Math.pow(kExp, minDist));
  // console.log(0.5, kExp, MExp);
  // return;

  const c = document.getElementById("bg") as HTMLCanvasElement;
  if (!c || c.tagName.toLowerCase() !== "canvas") {
    return;
  }
  context = c.getContext("2d");
  c.width = w;
  c.height = h;
  const xs = Math.round(w / d);
  const dx = w / xs;
  const ys = Math.round(h / (d * SQRT3_2) * 2);
  const dy = w / ys;
  points = [];
  for (let i = 0; i <= ys; i++) {
    points[i] = [];
    for (let j = 0; j <= xs; j++) {
      const x = dx * (j + between(-0.1, 0.1) + (i % 2 ? 0 : 0.5));
      const y = dy * (i + between(-0.1, 0.1));
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
document.addEventListener("mousemove", (e: MouseEvent) => {
  mouse = [e.clientX, e.clientY, mouseZ];
  if (!drawn) {
    requestAnimationFrame(drawAll);
    // drawn = true;
  }
});
let prevMin = 0;
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
  const growth = 0.5 * maxZ * diffSeconds;
  let nextMin = maxZ;
  mapPoints((i, j, point) => {
    nextMin = Math.min(nextMin, point[2]);
    let z = point[2] - prevMin;
    const distance = calculateDist(mouse, point, true);
    z += growth * clamp((1 - distance * 1 / effectArea), 0, 1);
    point[2] = Math.min(maxZ, z);
  });
  prevMin = nextMin;
  then = now;
  requestAnimationFrame(drawAll);
}
let interval: ReturnType<typeof setInterval> = 0;
function startGrowth() {
  stopGrowth();
  interval = setInterval(changeHeights, 50);
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