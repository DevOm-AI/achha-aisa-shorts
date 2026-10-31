import React from "react";
import { Proj } from "./art";
import { EARTH_R, FoldState, SHEET_L, STACK_W, T0, clamp01 } from "./timeline";

const TOP = "#fdfdf9";
const FRONT = "#dedcd3";
const SIDE = "#c4c1b6";
const UNDER = "#ecebe4";

const lerpColor = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
};

const clampY = (y: number) => Math.max(-3000, Math.min(5000, y));

// A flat block of paper lying on the ground, drawn with front, top and side faces.
const Block: React.FC<{
  x0: number;
  x1: number;
  yb: number;
  yt: number;
  dvx: number;
  dvy: number;
  stripes: boolean;
  solid?: string;
}> = ({ x0, x1, yb, yt, dvx, dvy, stripes, solid }) => (
  <g>
    <polygon points={`${x1},${yt} ${x1 + dvx},${yt + dvy} ${x1 + dvx},${yb + dvy} ${x1},${yb}`} fill={SIDE} />
    <polygon points={`${x0},${yt} ${x1},${yt} ${x1 + dvx},${yt + dvy} ${x0 + dvx},${yt + dvy}`} fill={TOP} />
    <rect x={x0} y={yt} width={x1 - x0} height={yb - yt} fill={solid ?? "url(#paperFront)"} />
    {stripes ? <rect x={x0} y={yt} width={x1 - x0} height={yb - yt} fill="url(#layers)" /> : null}
  </g>
);

export const Stack: React.FC<{ p: Proj; fs: FoldState; glow: number }> = ({ p, fs, glow }) => {
  const { n } = fs;
  const flat = EARTH_R * p.ppm > 2e5;
  const yb = p.sy(0);
  const layerPx = T0 * p.ppm;
  const stripeSpacing = Math.max(layerPx, 5);

  const defs = (
    <defs>
      <linearGradient id="paperFront" x1="0" x2="1">
        <stop offset="0" stopColor="#f3f1ea" />
        <stop offset="0.6" stopColor={FRONT} />
        <stop offset="1" stopColor="#cfccc2" />
      </linearGradient>
      <pattern
        id="layers"
        width={8}
        height={stripeSpacing}
        patternUnits="userSpaceOnUse"
        patternTransform={`translate(0 ${yb % stripeSpacing})`}
      >
        <rect x={0} y={0} width={8} height={Math.min(1.2, stripeSpacing / 3)} fill="#000" opacity={0.13} />
      </pattern>
      <filter id="beamGlow" x="-200%" y="-5%" width="500%" height="110%">
        <feGaussianBlur stdDeviation={9} />
      </filter>
    </defs>
  );

  // ---------- Literal folds of the sheet (0..3) ----------
  if (n < 3) {
    const k = Math.floor(n);
    const f = n - k;
    const Tk = T0 * Math.pow(2, k);
    const Lk = SHEET_L / Math.pow(2, k);
    const left = -STACK_W / 2;
    const D = 0.21 * Math.pow(2, -0.6 * n);
    const dvx = 0.2 * D * p.ppm;
    const dvy = -0.14 * D * p.ppm;
    const th = Math.max(Tk * p.ppm, 2.5);
    const x0 = p.sx(left);
    const xEnd = f > 0 ? p.sx(left + Lk / 2) : p.sx(left + Lk);

    let flap: React.ReactNode = null;
    if (f > 0) {
      const theta = Math.PI * f;
      const N = 12;
      const segPx = ((Lk / 2) * p.ppm) / N;
      const hx = xEnd;
      const hy = yb - th;
      const pts: [number, number][] = [[hx, hy]];
      const angles: number[] = [];
      for (let i = 0; i < N; i++) {
        const a = Math.min(Math.PI, theta + 0.6 * Math.sin(theta) * ((i + 0.5) / N));
        angles.push(a);
        const [px, py] = pts[i];
        pts.push([px + Math.cos(a) * segPx, py - Math.sin(a) * segPx]);
      }
      flap = (
        <g>
          {angles.map((a, i) => {
            const [ax, ay] = pts[i];
            const [bx, by] = pts[i + 1];
            const under = clamp01((a - 0.9) / 0.4);
            const light = 0.85 + 0.15 * Math.cos(a - 0.5);
            const col = lerpColor(TOP, UNDER, under);
            return (
              <polygon
                key={i}
                points={`${ax},${ay} ${bx},${by} ${bx + dvx},${by + dvy} ${ax + dvx},${ay + dvy}`}
                fill={col}
                stroke={col}
                strokeWidth={0.8}
                opacity={light}
              />
            );
          })}
          <polyline
            points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="#d2d0c6"
            strokeWidth={th}
            strokeLinejoin="round"
          />
        </g>
      );
    }

    return (
      <g>
        {defs}
        <ellipse cx={(x0 + xEnd) / 2 + dvx / 2} cy={yb + 4} rx={(xEnd - x0) / 2 + 30} ry={10} fill="#000" opacity={0.18} />
        <Block x0={x0} x1={xEnd} yb={yb} yt={yb - th} dvx={dvx} dvy={dvy} stripes={false} />
        {flap}
      </g>
    );
  }

  // ---------- Stack of paper (3..42) ----------
  const stepping = fs.mode === "step" && fs.f > 0;
  const exp = fs.mode === "smooth" ? n : fs.k;
  const Hb = T0 * Math.pow(2, exp);
  const wpx = STACK_W * p.ppm;
  const drawW = Math.max(wpx, 5);
  const beam = clamp01((8 - wpx) / 5);
  const cx = p.sx(0);
  const x0 = cx - drawW / 2;
  const x1 = cx + drawW / 2;
  const squash = 1 - 0.07 * fs.impact * (1 - beam);
  const ytRaw = yb - Math.max(Hb * p.ppm * squash, 2);
  const yt = clampY(ytRaw);
  const ybC = clampY(yb);
  const Ds = Math.min(0.05 * p.ppm, 140);
  const dvx = 0.2 * Ds * (1 - beam);
  const dvy = -0.14 * Ds * (1 - beam);

  const twin = (theta: number, opacity: number, key: string) => {
    const bh = ybC - ytRaw;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const rot = ([x, y]: [number, number]) => `${x1 + x * c + y * s},${ytRaw - x * s + y * c}`;
    const corners: [number, number][] = [
      [0, bh],
      [drawW, bh],
      [drawW, 0],
      [0, 0],
    ];
    return (
      <polygon
        key={key}
        points={corners.map(rot).join(" ")}
        fill={beam > 0.5 ? "#ffffff" : "url(#paperFront)"}
        stroke="#bcb9ae"
        strokeWidth={beam > 0.5 ? 0 : 1}
        opacity={opacity}
      />
    );
  };

  return (
    <g>
      {defs}
      {glow > 0.01 ? (
        <rect
          x={cx - drawW * 2 - 6}
          y={Math.max(yt, -200)}
          width={drawW * 4 + 12}
          height={Math.max(0, Math.min(ybC, 2200) - Math.max(yt, -200))}
          fill="#bfe3ff"
          opacity={glow * 0.7}
          filter="url(#beamGlow)"
        />
      ) : null}
      {flat && beam < 1 ? (
        <ellipse cx={cx + dvx * 0.5} cy={yb + 3} rx={drawW * 0.62 + dvx * 0.6} ry={Math.min(14, Math.max(4, drawW * 0.05))} fill="#000" opacity={0.22 * (1 - beam)} />
      ) : null}
      <Block x0={x0} x1={x1} yb={ybC} yt={yt} dvx={dvx} dvy={dvy} stripes={beam < 0.5} solid={beam > 0.5 ? "#ffffff" : undefined} />
      {stepping ? (
        <g>
          {[3, 2, 1].map((g) =>
            fs.f > 0.08 && fs.f < 0.92 ? twin(Math.PI * fs.f - g * 0.13, 0.1 + 0.06 * (3 - g), `ghost${g}`) : null,
          )}
          {twin(Math.PI * fs.f, clamp01(fs.f / 0.1), "twin")}
        </g>
      ) : null}
      {beam > 0.01 && yt > -100 && yt < 2000 ? (
        <g opacity={beam}>
          <circle cx={cx} cy={yt} r={22} fill="#dff1ff" opacity={0.5} filter="url(#beamGlow)" />
          <circle cx={cx} cy={yt} r={7} fill="#ffffff" />
        </g>
      ) : null}
    </g>
  );
};
