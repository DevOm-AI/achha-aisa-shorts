import { interpolate, interpolateColors } from "remotion";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION = 900;

// Physical constants (meters)
export const T0 = 0.0001; // paper thickness: 0.1 mm
export const SHEET_L = 0.297; // A4 length
export const STACK_W = SHEET_L / 8; // width once the literal folds are done
export const EARTH_R = 6_371_000;
export const MOON_ALT = 384_400_000;
export const MOON_R = 1_737_400;
export const MOON_X = 2_600_000;
export const GROUND_Y = 1500; // screen y of the ground during the climb

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeInOut = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Segment = {
  start: number; // seconds
  end: number;
  from: number;
  to: number;
  mode: "step" | "smooth";
  accel?: number; // >1 = folds speed up towards the end
};

// The whole story, as fold counts over time.
export const SEGMENTS: Segment[] = [
  { start: 3.2, end: 6.2, from: 0, to: 3, mode: "step" },
  { start: 6.2, end: 8.6, from: 3, to: 10, mode: "step" },
  { start: 9.6, end: 10.6, from: 10, to: 14, mode: "step" },
  { start: 11.8, end: 12.6, from: 14, to: 17, mode: "step" },
  { start: 13.8, end: 14.8, from: 17, to: 23, mode: "step" },
  { start: 16.2, end: 17.0, from: 23, to: 27, mode: "step" },
  { start: 18.4, end: 19.0, from: 27, to: 30, mode: "step" },
  { start: 20.4, end: 24.0, from: 30, to: 41, mode: "step", accel: 1.5 },
  { start: 24.0, end: 24.4, from: 41, to: 42, mode: "step" },
  { start: 26.8, end: 28.0, from: 42, to: 12, mode: "smooth" },
  { start: 29.2, end: 29.6, from: 12, to: 0, mode: "smooth" },
];

export const TEASER_START = 37;
export const TEASER_END = 75;
export const isTeaser = (frame: number) =>
  frame >= TEASER_START && frame < TEASER_END;

export type FoldState = {
  n: number; // continuous fold count
  k: number; // completed folds
  f: number; // progress of the fold in flight (0..1)
  mode: "step" | "smooth";
  impact: number; // 0..1, right after a fold lands
};

export const foldState = (frame: number): FoldState => {
  if (isTeaser(frame)) {
    return { n: 42, k: 42, f: 0, mode: "step", impact: 0 };
  }
  const t = Math.max(0, frame) / FPS;
  let held = 0;
  let endedAt = -10;
  for (const s of SEGMENTS) {
    if (t < s.start) break;
    if (t >= s.end) {
      held = s.to;
      endedAt = s.end;
      continue;
    }
    const p = (t - s.start) / (s.end - s.start);
    if (s.mode === "smooth") {
      const n = lerp(s.from, s.to, easeInOut(p));
      const k = Math.floor(n);
      return { n, k, f: n - k, mode: "smooth", impact: 0 };
    }
    const total = s.to - s.from;
    const u = Math.pow(p, s.accel ?? 1) * total;
    const i = Math.min(total - 1, Math.floor(u));
    const raw = u - i;
    const f = s.from < 3 ? easeInOut(raw) : easeInOutSine(raw);
    return {
      n: s.from + i + f,
      k: s.from + i,
      f,
      mode: "step",
      impact: i > 0 ? clamp01(1 - raw / 0.25) : 0,
    };
  }
  const since = t - endedAt;
  return {
    n: held,
    k: held,
    f: 0,
    mode: "step",
    impact: since < 1 ? Math.exp(-since * 9) : 0,
  };
};

// Frames on which a fold lands (used for sound effects).
export const foldLandings = (): { frame: number; fold: number }[] => {
  const out: { frame: number; fold: number }[] = [];
  for (const s of SEGMENTS) {
    if (s.mode !== "step") continue;
    const total = s.to - s.from;
    for (let i = 1; i <= total; i++) {
      const p = Math.pow(i / total, 1 / (s.accel ?? 1));
      out.push({
        frame: Math.round((s.start + p * (s.end - s.start)) * FPS) - 1,
        fold: s.from + i,
      });
    }
  }
  return out;
};

// Camera smoothing: weighted average of the fold count over recent frames.
export const camFold = (frame: number) => {
  let sum = 0;
  let wsum = 0;
  for (let j = 0; j < 10; j++) {
    const w = 10 - j;
    sum += foldState(frame - j).n * w;
    wsum += w;
  }
  return sum / wsum;
};

export type Cam = { ppm: number; X: number; C: number };

const climbCam = (nc: number, frame: number): Cam => {
  const H = T0 * Math.pow(2, nc);
  const L = SHEET_L / Math.pow(2, Math.min(Math.max(nc, 0), 3));
  // Slow push-in during the hook; eased back at the end so the last frame loops into the first.
  const hookPush = interpolate(frame, [0, 96, 860, 899], [1, 1.12, 1.12, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ppm = Math.min((640 / L) * hookPush, 650 / H);
  const paperCenter = -STACK_W / 2 + L / 2;
  const s = easeInOut(clamp01((nc - 6) / 4));
  return {
    ppm,
    X: lerp(paperCenter, 240 / ppm, s),
    C: (GROUND_Y - 960) / ppm,
  };
};

const moonCam = (frame: number): Cam => ({
  ppm:
    1.15e-4 *
    interpolate(frame, [732, 780], [1, 1.12], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  X: 1_300_000,
  C: MOON_ALT,
});

const teaserCam = (frame: number): Cam => ({
  ppm:
    0.95e-4 *
    interpolate(frame, [TEASER_START, TEASER_END], [1, 1.15], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  X: 1_300_000,
  C: MOON_ALT,
});

const wideCam = (frame: number): Cam => ({
  ppm:
    2.08e-6 *
    interpolate(frame, [790, 804], [1, 1.04], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  X: 0,
  C: 2.6e8,
});

// Blends cameras in screen-sensible ways: zoom in log space, and move the
// target early when zooming in / late when zooming out so subjects stay in frame.
const blendCam = (a: Cam, b: Cam, w: number): Cam => {
  if (w <= 0) return a;
  if (w >= 1) return b;
  const zoomIn = b.ppm > a.ppm;
  const wp = zoomIn ? 1 - Math.pow(1 - w, 3) : Math.pow(w, 3);
  return {
    ppm: Math.exp(lerp(Math.log(a.ppm), Math.log(b.ppm), w)),
    X: lerp(a.X, b.X, wp),
    C: lerp(a.C, b.C, wp),
  };
};

const ramp = (frame: number, input: number[], output: number[]) =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });

export const moonWeight = (frame: number) =>
  ramp(frame, [726, 744, 780, 798], [0, 1, 1, 0]);
export const wideWeight = (frame: number) =>
  ramp(frame, [777, 798, 804, 822], [0, 1, 1, 0]);

export const camera = (frame: number): Cam => {
  if (isTeaser(frame)) return teaserCam(frame);
  let cam = climbCam(camFold(frame), frame);
  cam = blendCam(cam, moonCam(frame), moonWeight(frame));
  cam = blendCam(cam, wideCam(frame), wideWeight(frame));
  return cam;
};

export const shake = (frame: number) => {
  const fs = foldState(frame);
  let amp = fs.impact * (fs.n < 3 ? 2 : 6);
  const big = (at: number, a: number, decay: number) =>
    frame >= at ? a * Math.exp(-(frame - at) / decay) : 0;
  amp += big(TEASER_START, 22, 6) * (isTeaser(frame) ? 1 : 0);
  amp += big(732, 34, 9);
  return {
    x: amp * (0.6 * Math.sin(frame * 12.9) + 0.4 * Math.sin(frame * 5.3)),
    y: amp * (0.6 * Math.cos(frame * 10.1) + 0.4 * Math.sin(frame * 7.7)),
  };
};

export const climbRate = (frame: number) =>
  isTeaser(frame) || isTeaser(frame - 1)
    ? 0
    : (camFold(frame) - camFold(frame - 1)) * FPS;

export const skyColors = (C: number) => {
  const la = Math.log10(Math.max(C, 1));
  return {
    top: interpolateColors(la, [3, 4, 4.7, 5.2], ["#2b8ae6", "#1a4aa8", "#0a1240", "#020309"]),
    bottom: interpolateColors(la, [3, 4, 4.7, 5.2], ["#a6e0ff", "#6aa9e8", "#26357a", "#04050d"]),
    space: clamp01((la - 4.5) / 0.7),
  };
};

export const formatHeight = (m: number) => {
  if (m < 0.01) return `${(m * 1000).toFixed(1)} mm`;
  if (m < 1) return `${(m * 100).toFixed(1)} cm`;
  if (m < 10) return `${m.toFixed(2)} m`;
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 100_000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m / 1000).toLocaleString("en-US")} km`;
};
