import React from "react";
import { interpolate, random } from "remotion";
import { Cam, clamp01, EARTH_R, MOON_ALT, MOON_R, MOON_X } from "./timeline";

export type Proj = Cam & {
  frame: number;
  n: number; // smoothed fold count, used for reveal timing
  sx: (x: number) => number;
  sy: (alt: number) => number;
};

export const makeProj = (cam: Cam, frame: number, n: number): Proj => ({
  ...cam,
  frame,
  n,
  sx: (x) => 540 + (x - cam.X) * cam.ppm,
  sy: (alt) => 960 - (alt - cam.C) * cam.ppm,
});

const fade = (v: number, input: number[], output: number[]) =>
  interpolate(v, input, output, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Places an SVG drawing (in its own viewBox units) at a real-world size.
const WorldBox: React.FC<{
  p: Proj;
  x: number; // center x (m)
  bottom: number; // altitude of bottom edge (m)
  w: number;
  h: number;
  vb: [number, number];
  minPx?: number;
  opacity?: number;
  children: React.ReactNode;
}> = ({ p, x, bottom, w, h, vb, minPx = 1.5, opacity = 1, children }) => {
  const pw = w * p.ppm;
  const ph = h * p.ppm;
  if (ph < minPx || ph > 60000 || opacity <= 0.001) return null;
  const left = p.sx(x - w / 2);
  const top = p.sy(bottom + h);
  if (left > 1400 || left + pw < -300 || top > 2200 || top + ph < -300) return null;
  return (
    <svg
      x={left}
      y={top}
      width={pw}
      height={ph}
      viewBox={`0 0 ${vb[0]} ${vb[1]}`}
      preserveAspectRatio="none"
      overflow="visible"
      opacity={opacity}
    >
      {children}
    </svg>
  );
};

// ---------- Ground level ----------

const BLADES = new Array(90).fill(0).map((_, i) => ({
  x: -0.7 + random(`bx${i}`) * 1.9,
  h: 0.012 + random(`bh${i}`) * 0.05,
  w: 0.003 + random(`bw${i}`) * 0.004,
  c: ["#3f9e45", "#4fb553", "#358a3b", "#5cc261"][Math.floor(random(`bc${i}`) * 4)],
  phase: random(`bp${i}`) * 6.28,
  front: random(`bf${i}`) < 0.18,
}));

export const Grass: React.FC<{ p: Proj; front: boolean }> = ({ p, front }) => {
  const t = p.frame / 30;
  return (
    <g>
      {BLADES.filter((b) => b.front === front).map((b, i) => {
        const hp = b.h * p.ppm;
        if (hp < 3 || hp > 3000) return null;
        const bx = p.sx(b.x);
        if (bx < -100 || bx > 1180) return null;
        const by = p.sy(0) + (front ? 6 : 0);
        const hw = (b.w * p.ppm) / 2;
        const sway = (0.18 + 0.1 * Math.sin(t * 1.7 + b.phase)) * hp;
        return (
          <path
            key={i}
            d={`M${bx - hw} ${by} Q${bx + sway * 0.2} ${by - hp * 0.6} ${bx + sway} ${by - hp} Q${bx + sway * 0.3} ${by - hp * 0.5} ${bx + hw} ${by} Z`}
            fill={b.c}
          />
        );
      })}
    </g>
  );
};

export const Mug: React.FC<{ p: Proj }> = ({ p }) => {
  const t = p.frame / 30;
  return (
    <WorldBox p={p} x={0.075} bottom={0} w={0.085} h={0.11} vb={[100, 110]} minPx={4}>
      {[0, 1, 2].map((i) => {
        const cycle = (t * 0.6 + i / 3) % 1;
        return (
          <path
            key={i}
            d={`M${32 + i * 16} ${12 - cycle * 40} q -8 -10 0 -20 q 8 -10 0 -20`}
            stroke="white"
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
            opacity={Math.sin(cycle * Math.PI) * 0.55}
          />
        );
      })}
      <path d="M88 38 C114 38 114 84 85 86" stroke="#d94f3d" strokeWidth={10} fill="none" />
      <path d="M10 20 L90 20 L86 100 Q85 109 76 109 L24 109 Q15 109 14 100 Z" fill="#e85d4a" />
      <path d="M62 20 L90 20 L86 100 Q85 109 76 109 L58 109 Z" fill="#000" opacity={0.12} />
      <ellipse cx={50} cy={20} rx={40} ry={7} fill="#c44434" />
      <ellipse cx={50} cy={21} rx={35} ry={5} fill="#5a3418" />
      <rect x={22} y={32} width={7} height={58} rx={3.5} fill="white" opacity={0.3} />
      <text x={50} y={72} fontSize={22} fontWeight={900} fontFamily="Montserrat" fill="white" textAnchor="middle" opacity={0.9}>
        ♥
      </text>
    </WorldBox>
  );
};

// A person standing to the right of the stack, reacting as it grows.
export const Person: React.FC<{ p: Proj }> = ({ p }) => {
  const amazed = fade(p.n, [12, 14], [0, 1]);
  const tilt = fade(p.n, [11, 15.5], [0, 28]);
  const arm = fade(p.n, [13, 14.6], [12, 158]);
  const blink = p.frame % 75 < 3 ? 0.15 : 1;
  const bob = Math.sin(p.frame / 8) * 0.6;
  return (
    <WorldBox p={p} x={0.9} bottom={0} w={0.7} h={1.75} vb={[70, 175]} minPx={6}>
      <ellipse cx={35} cy={172} rx={22} ry={3} fill="#000" opacity={0.2} />
      {/* legs */}
      <rect x={25} y={100} width={9} height={70} rx={4} fill="#2c3e70" />
      <rect x={37} y={100} width={9} height={70} rx={4} fill="#34497f" />
      <ellipse cx={27} cy={170} rx={9} ry={4} fill="#1e1e1e" />
      <ellipse cx={40} cy={170} rx={9} ry={4} fill="#262626" />
      {/* back arm */}
      <rect x={42} y={46 + bob} width={8} height={46} rx={4} fill="#e2503f" />
      {/* torso */}
      <rect x={20} y={40 + bob} width={31} height={66} rx={12} fill="#ff6b5a" />
      <rect x={20} y={86 + bob} width={31} height={8} fill="#000" opacity={0.08} />
      {/* neck */}
      <rect x={31} y={30 + bob} width={9} height={12} rx={3} fill="#e7b18e" />
      {/* head */}
      <g transform={`rotate(${tilt} 35 34)`}>
        <circle cx={35} cy={20 + bob} r={13} fill="#f2c19f" />
        <path d={`M23 ${17 + bob} Q24 ${3 + bob} 38 ${5 + bob} Q51 ${7 + bob} 49 ${22 + bob} Q44 ${13 + bob} 36 ${13 + bob} Q28 ${12 + bob} 23 ${17 + bob} Z`} fill="#3b2a20" />
        <ellipse cx={27} cy={18 + bob} rx={2.2} ry={2.6 * blink} fill="#1d1d1d" />
        <path d={`M24 ${13.5 + bob - amazed * 1.5} q3 -2 6 0`} stroke="#3b2a20" strokeWidth={1.4} fill="none" />
        <ellipse cx={26} cy={27 + bob} rx={1.5 + amazed * 1.5} ry={1 + amazed * 2.6} fill="#7a2e22" />
        <path d={`M22 ${20 + bob} q-3 2 0 4`} stroke="#d99a77" strokeWidth={1.5} fill="none" />
      </g>
      {/* pointing arm, pivoting at the shoulder */}
      <g transform={`rotate(${arm} 26 ${48 + bob})`}>
        <rect x={22} y={44 + bob} width={8} height={46} rx={4} fill="#ff7b6b" />
        <circle cx={26} cy={91 + bob} r={4.5} fill="#f2c19f" />
      </g>
    </WorldBox>
  );
};

const Tree: React.FC<{ p: Proj; x: number; h: number; tone?: number }> = ({ p, x, h, tone = 0 }) => (
  <WorldBox p={p} x={x} bottom={0} w={h * 0.6} h={h} vb={[60, 100]} minPx={4}>
    <rect x={26} y={58} width={8} height={42} rx={2} fill="#7b5232" />
    <circle cx={30} cy={38} r={25} fill={tone ? "#3c8f46" : "#43a04d"} />
    <circle cx={15} cy={52} r={16} fill={tone ? "#357f3f" : "#3b9145"} />
    <circle cx={45} cy={52} r={16} fill={tone ? "#46a352" : "#4fb55a"} />
    <circle cx={36} cy={28} r={12} fill="#fff" opacity={0.1} />
  </WorldBox>
);

const Bush: React.FC<{ p: Proj; x: number; h: number }> = ({ p, x, h }) => (
  <WorldBox p={p} x={x} bottom={0} w={h * 1.8} h={h} vb={[90, 50]} minPx={3}>
    <circle cx={25} cy={32} r={18} fill="#3d9a47" />
    <circle cx={48} cy={24} r={24} fill="#48ad52" />
    <circle cx={70} cy={33} r={17} fill="#3a9244" />
    <rect x={8} y={32} width={76} height={18} fill="#3d9a47" />
  </WorldBox>
);

export const Neighborhood: React.FC<{ p: Proj }> = ({ p }) => (
  <g>
    <Tree p={p} x={-4.5} h={9} tone={1} />
    <WorldBox p={p} x={8.5} bottom={0} w={10} h={9.5} vb={[100, 95]} minPx={4}>
      <rect x={68} y={10} width={9} height={24} fill="#8e3b2f" />
      <rect x={10} y={40} width={80} height={55} fill="#f4e1c1" />
      <rect x={60} y={40} width={30} height={55} fill="#000" opacity={0.07} />
      <polygon points="2,44 50,4 98,44" fill="#c0392b" />
      <polygon points="50,4 98,44 80,44" fill="#000" opacity={0.12} />
      <rect x={44} y={66} width={14} height={29} rx={1} fill="#6d4c41" />
      <circle cx={55} cy={81} r={1.2} fill="#f5c542" />
      {[
        [18, 50],
        [66, 50],
        [18, 72],
        [70, 72],
      ].map(([wx, wy], i) => (
        <g key={i}>
          <rect x={wx} y={wy} width={14} height={13} fill="#ffe08a" stroke="#fff" strokeWidth={1.5} />
          <line x1={wx + 7} y1={wy} x2={wx + 7} y2={wy + 13} stroke="#fff" strokeWidth={1.2} />
        </g>
      ))}
    </WorldBox>
    <Tree p={p} x={2.8} h={7} />
    <Bush p={p} x={1.6} h={0.7} />
    <Bush p={p} x={-1.4} h={0.55} />
  </g>
);

// ---------- City ----------

const BUILDINGS = new Array(26).fill(0).map((_, i) => {
  const left = i < 9;
  return {
    x: left ? -1300 + i * 130 + random(`cx${i}`) * 50 : 150 + (i - 9) * 70 + random(`cx${i}`) * 30,
    w: 35 + random(`cw${i}`) * 45,
    h: 60 + random(`ch${i}`) * (left ? 180 : 260),
    c: ["#5b6f95", "#6a7fa6", "#4f6288", "#7487ad"][Math.floor(random(`cc${i}`) * 4)],
  };
});

export const City: React.FC<{ p: Proj }> = ({ p }) => {
  const winSpacing = Math.max(4 * p.ppm, 9);
  return (
    <g>
      <defs>
        <pattern id="windows" width={winSpacing} height={winSpacing} patternUnits="userSpaceOnUse">
          <rect x={winSpacing * 0.3} y={winSpacing * 0.3} width={winSpacing * 0.35} height={winSpacing * 0.35} fill="#ffe7a3" opacity={0.55} />
        </pattern>
        <linearGradient id="burj" x1="0" x2="1">
          <stop offset="0" stopColor="#c9d6ea" />
          <stop offset="0.5" stopColor="#9fb3d1" />
          <stop offset="0.5" stopColor="#7b8fb0" />
          <stop offset="1" stopColor="#6a7d9c" />
        </linearGradient>
      </defs>
      {BUILDINGS.map((b, i) => {
        const hp = b.h * p.ppm;
        if (hp < 2 || hp > 20000) return null;
        const x = p.sx(b.x - b.w / 2);
        const y = p.sy(b.h);
        if (x > 1200 || x + b.w * p.ppm < -100) return null;
        return (
          <g key={i}>
            <rect x={x} y={y} width={b.w * p.ppm} height={hp} fill={b.c} />
            {hp > 30 ? <rect x={x} y={y} width={b.w * p.ppm} height={hp} fill="url(#windows)" /> : null}
          </g>
        );
      })}
      <WorldBox p={p} x={430} bottom={0} w={120} h={830} vb={[120, 830]} minPx={3}>
        <polygon
          points="10,830 10,700 22,700 22,560 32,560 32,430 42,430 42,300 50,300 50,190 56,190 58,60 60,0 62,60 64,190 70,190 70,300 78,300 78,430 88,430 88,560 98,560 98,700 110,700 110,830"
          fill="url(#burj)"
        />
        <rect x={58.5} y={0} width={3} height={30} fill="#fff" opacity={0.8} />
      </WorldBox>
    </g>
  );
};

// ---------- Sky: clouds, mountains, plane ----------

const CLOUDS = new Array(14).fill(0).map((_, i) => ({
  x: -9000 + random(`kx${i}`) * 20000,
  alt: 1100 + random(`ka${i}`) * 1800,
  w: 900 + random(`kw${i}`) * 2200,
  drift: 6 + random(`kd${i}`) * 10,
}));

export const Clouds: React.FC<{ p: Proj }> = ({ p }) => {
  const t = p.frame / 30;
  return (
    <g>
      {CLOUDS.map((c, i) => (
        <WorldBox key={i} p={p} x={c.x + t * c.drift * 30} bottom={c.alt} w={c.w} h={c.w * 0.42} vb={[200, 84]} minPx={3} opacity={0.95}>
          <ellipse cx={100} cy={70} rx={88} ry={14} fill="#d7e4f2" />
          <circle cx={52} cy={56} r={28} fill="#f4f8fc" />
          <circle cx={92} cy={40} r={38} fill="#ffffff" />
          <circle cx={136} cy={52} r={30} fill="#f7fafd" />
          <circle cx={168} cy={62} r={19} fill="#eef3f9" />
          <rect x={30} y={56} width={150} height={20} rx={10} fill="#fbfdff" />
        </WorldBox>
      ))}
    </g>
  );
};

const RANGE: [number, number][] = [
  [-16000, 0], [-11000, 4200], [-8000, 3100], [-5000, 6100], [-2500, 4300],
  [1000, 6900], [4000, 5200], [8000, 8849], [10500, 6500], [12500, 8516],
  [15500, 5800], [18500, 7300], [22000, 4600], [27000, 0],
];

export const Mountains: React.FC<{ p: Proj }> = ({ p }) => {
  // Far away: only fades in once the camera is high enough.
  const lp = Math.log10(p.ppm);
  const opacity = fade(lp, [Math.log10(0.09), Math.log10(0.2)], [1, 0]) *
    fade(lp, [Math.log10(1.5e-4), Math.log10(4e-4)], [0, 1]);
  if (opacity <= 0.01) return null;
  const pts = RANGE.map(([x, h]) => `${p.sx(x)},${p.sy(h)}`).join(" ");
  const back = RANGE.map(([x, h]) => `${p.sx(x * 1.1 + 3000)},${p.sy(h * 0.8)}`).join(" ");
  return (
    <g opacity={opacity}>
      <polygon points={back} fill="#8798bf" />
      <polygon points={pts} fill="#5d6f99" />
      {RANGE.filter(([, h]) => h > 6000).map(([x, h], i) => {
        const cap = h * 0.16;
        return (
          <polygon
            key={i}
            points={`${p.sx(x)},${p.sy(h)} ${p.sx(x - cap * 0.9)},${p.sy(h - cap)} ${p.sx(x - cap * 0.3)},${p.sy(h - cap * 0.75)} ${p.sx(x + cap * 0.2)},${p.sy(h - cap * 1.05)} ${p.sx(x + cap * 0.85)},${p.sy(h - cap)}`}
            fill="#f3f7ff"
          />
        );
      })}
    </g>
  );
};

export const Plane: React.FC<{ p: Proj }> = ({ p }) => {
  const t = p.frame / 30;
  const x = -12000 + (t - 15.5) * 6000;
  const alt = 10700;
  const opacity = fade(p.n, [25, 26], [0, 1]) * fade(p.n, [29, 30], [1, 0]);
  if (opacity <= 0.01) return null;
  const trailLen = 9000;
  return (
    <g opacity={opacity}>
      <defs>
        <linearGradient id="trail" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#fff" stopOpacity={0.85} />
        </linearGradient>
      </defs>
      <rect
        x={p.sx(x - 700 - trailLen)}
        y={p.sy(alt + 330)}
        width={trailLen * p.ppm}
        height={Math.max(2, 90 * p.ppm)}
        fill="url(#trail)"
      />
      <WorldBox p={p} x={x} bottom={alt} w={1400} h={420} vb={[100, 30]} minPx={2}>
        <polygon points="6,11 13,0 21,11" fill="#e8eef7" />
        <path d="M5 15 Q5 10 15 10 L84 10 Q97 12 99 16 Q97 19 85 20 L15 20 Q5 20 5 15 Z" fill="#ffffff" />
        <path d="M5 17 L99 17 Q97 19 85 20 L15 20 Q5 20 5 17 Z" fill="#c9d3e3" />
        <polygon points="40,16 62,16 50,29 43,29" fill="#b8c4d8" />
        <rect x={86} y={12} width={6} height={3} rx={1} fill="#2b3a55" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <circle key={i} cx={26 + i * 6.5} cy={13.5} r={1.1} fill="#5b7bb0" />
        ))}
      </WorldBox>
    </g>
  );
};

// ---------- Space ----------

export const KarmanLine: React.FC<{ p: Proj }> = ({ p }) => {
  const opacity = fade(p.n, [28.6, 29.6], [0, 1]) * fade(p.n, [32, 33.5], [1, 0]);
  if (opacity <= 0.01) return null;
  const y = p.sy(100_000);
  if (y < -50 || y > 1970) return null;
  return (
    <g opacity={opacity}>
      <line x1={0} x2={1080} y1={y} y2={y} stroke="#9fd0ff" strokeWidth={4} strokeDasharray="22 16" />
    </g>
  );
};

export const ISS: React.FC<{ p: Proj }> = ({ p }) => {
  const t = p.frame / 30;
  const opacity = fade(p.n, [30.5, 31.5], [0, 1]) * fade(p.n, [34, 35.5], [1, 0]);
  if (opacity <= 0.01) return null;
  return (
    <WorldBox p={p} x={330_000 - (t - 19.5) * 32_000} bottom={408_000} w={42_000} h={17_000} vb={[100, 40]} opacity={opacity}>
      <rect x={4} y={18} width={92} height={4} fill="#c7ccd6" />
      {[
        [8, 1],
        [8, 25],
        [76, 1],
        [76, 25],
      ].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width={16} height={14} fill="#d39b2a" />
          <line x1={x + 8} y1={y} x2={x + 8} y2={y + 14} stroke="#8a5d0d" strokeWidth={0.8} />
          <line x1={x} y1={y + 7} x2={x + 16} y2={y + 7} stroke="#8a5d0d" strokeWidth={0.8} />
        </g>
      ))}
      <rect x={38} y={13} width={24} height={14} rx={3} fill="#f2f4f8" />
      <rect x={46} y={9} width={8} height={22} rx={2} fill="#e3e7ee" />
    </WorldBox>
  );
};

const STARS = new Array(170).fill(0).map((_, i) => ({
  x: random(`sx${i}`) * 1080,
  y: random(`sy${i}`) * 1920,
  r: 0.8 + Math.pow(random(`sr${i}`), 3) * 2.6,
  tw: random(`st${i}`) * 6.28,
}));

export const Stars: React.FC<{ p: Proj; amount: number }> = ({ p, amount }) => {
  if (amount <= 0.01) return null;
  const drift = Math.log10(Math.max(p.C, 1)) * 90;
  return (
    <g opacity={amount}>
      {STARS.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={(s.y + drift) % 1920}
          r={s.r}
          fill="#fff"
          opacity={0.55 + 0.45 * Math.sin(p.frame / 6 + s.tw)}
        />
      ))}
    </g>
  );
};

// Ground (flat) close up, a planet from far away.
export const Earth: React.FC<{ p: Proj; wide: number }> = ({ p, wide }) => {
  const r = EARTH_R * p.ppm;
  const groundY = p.sy(0);
  if (r > 2e5) {
    if (groundY > 1960) return null;
    const lp = Math.log10(p.ppm);
    const top = interpolateGround(lp, 0);
    const bottom = interpolateGround(lp, 1);
    return (
      <g>
        <defs>
          <linearGradient id="ground" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="1" stopColor={bottom} />
          </linearGradient>
        </defs>
        <rect x={-50} y={groundY} width={1180} height={Math.max(0, 2000 - groundY)} fill="url(#ground)" />
        <rect x={-50} y={groundY} width={1180} height={4} fill="#000" opacity={0.08} />
      </g>
    );
  }
  const cx = p.sx(0);
  const cy = p.sy(-EARTH_R);
  const rv = r + wide * Math.max(0, 30 - r);
  const atmoR = rv + Math.max(rv * 0.015, 10);
  return (
    <g>
      <defs>
        <radialGradient id="atmo">
          <stop offset={rv / atmoR} stopColor="#7cc4ff" stopOpacity={0.9} />
          <stop offset="1" stopColor="#7cc4ff" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="ocean" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#3f8fe0" />
          <stop offset="1" stopColor="#123a7a" />
        </radialGradient>
        <clipPath id="earthClip">
          <circle cx={cx} cy={cy} r={rv} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={atmoR} fill="url(#atmo)" />
      <circle cx={cx} cy={cy} r={rv} fill="url(#ocean)" />
      <g clipPath="url(#earthClip)">
        <g transform={`translate(${cx} ${cy}) scale(${rv})`}>
          <path d="M-0.7 -1.2 L0.7 -1.2 C0.65 -0.9 0.5 -0.75 0.55 -0.55 C0.6 -0.35 0.35 -0.2 0.2 -0.35 C0.05 -0.5 -0.15 -0.4 -0.3 -0.5 C-0.5 -0.62 -0.75 -0.5 -0.8 -0.7 C-0.85 -0.9 -0.75 -1.0 -0.7 -1.2 Z" fill="#5a9a62" />
          <path d="M-0.3 0.2 C-0.1 0.15 0.05 0.35 -0.05 0.55 C-0.15 0.75 -0.4 0.6 -0.45 0.42 C-0.5 0.3 -0.42 0.22 -0.3 0.2 Z" fill="#5aa35a" />
          <path d="M-0.95 -0.1 C-0.8 -0.2 -0.7 0 -0.75 0.15 C-0.8 0.3 -0.98 0.2 -0.95 -0.1 Z" fill="#4c9a52" />
        </g>
      </g>
    </g>
  );
};

const interpolateGround = (logPpm: number, which: 0 | 1) => {
  const tops = ["#5a9a62", "#5cae5e", "#62bf5f"];
  const bottoms = ["#528f5a", "#3e8a45", "#3f9a45"];
  const arr = which === 0 ? tops : bottoms;
  const i = logPpm < -1 ? 0 : logPpm < 1.5 ? 1 : 2;
  return arr[i];
};

export const Moon: React.FC<{ p: Proj; wide: number }> = ({ p, wide }) => {
  const r = MOON_R * p.ppm;
  const rv = r + wide * Math.max(0, 12 - r);
  const cx = p.sx(MOON_X);
  const cy = p.sy(MOON_ALT);
  if (rv < 0.6 || cx < -rv * 2 - 50 || cx > 1080 + rv * 2 + 50 || cy < -rv * 2 - 50 || cy > 1920 + rv * 2 + 50) {
    return null;
  }
  const craters: [number, number, number][] = [
    [-0.35, -0.3, 0.18], [0.25, -0.45, 0.1], [0.3, 0.2, 0.22], [-0.2, 0.4, 0.13],
    [-0.55, 0.1, 0.09], [0.05, -0.05, 0.08], [0.55, -0.1, 0.07], [0.0, 0.65, 0.09],
  ];
  return (
    <g>
      <defs>
        <radialGradient id="moonGlow">
          <stop offset="0.45" stopColor="#fffbe8" stopOpacity={0.45} />
          <stop offset="1" stopColor="#fffbe8" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="moonFace" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#fbf8ee" />
          <stop offset="0.7" stopColor="#cfc8b8" />
          <stop offset="1" stopColor="#8f8a80" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={rv * 2.2 + 10} fill="url(#moonGlow)" />
      <circle cx={cx} cy={cy} r={rv} fill="url(#moonFace)" />
      {rv > 6
        ? craters.map(([x, y, cr], i) => (
            <g key={i}>
              <circle cx={cx + x * rv} cy={cy + y * rv} r={cr * rv} fill="#9c958a" opacity={0.45} />
              <circle cx={cx + x * rv + cr * rv * 0.15} cy={cy + y * rv + cr * rv * 0.15} r={cr * rv * 0.8} fill="#b9b2a5" opacity={0.5} />
            </g>
          ))
        : null}
    </g>
  );
};

export const glowAmount = (p: Proj) => clamp01((Math.log10(p.C) - 4.3) / 0.8);
