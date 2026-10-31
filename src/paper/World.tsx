import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  City,
  Clouds,
  Earth,
  glowAmount,
  Grass,
  ISS,
  KarmanLine,
  makeProj,
  Moon,
  Mountains,
  Mug,
  Neighborhood,
  Person,
  Plane,
  Proj,
  Stars,
} from "./art";
import { Stack } from "./Stack";
import {
  camera,
  camFold,
  EARTH_R,
  foldState,
  isTeaser,
  MOON_ALT,
  MOON_R,
  MOON_X,
  shake,
  skyColors,
  wideWeight,
} from "./timeline";

type LabelSpec = {
  text: string;
  x: number; // world anchor
  alt: number;
  show: number; // 0..1
  screenX?: number;
};

const windowed = (n: number, a: number, b: number) =>
  interpolate(n, [a, a + 0.4, b - 0.4, b], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const Label: React.FC<{ p: Proj; spec: LabelSpec }> = ({ p, spec }) => {
  if (spec.show <= 0.01) return null;
  const ax = spec.screenX ?? p.sx(spec.x);
  const ay = p.sy(spec.alt);
  if (ay < 400 || ay > 1900) return null;
  const x = Math.min(1040, Math.max(40, ax));
  const scale = 0.7 + 0.3 * spec.show;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: ay - 22,
        translate: "-50% -100%",
        scale: String(scale),
        transformOrigin: "50% 100%",
        opacity: spec.show,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: "Montserrat",
          fontWeight: 800,
          fontSize: 34,
          color: "white",
          whiteSpace: "nowrap",
          padding: "10px 22px",
          borderRadius: 999,
          backgroundColor: "rgba(10,14,30,0.78)",
          border: "2px solid rgba(255,255,255,0.25)",
        }}
      >
        {spec.text}
      </div>
      <div style={{ width: 3, height: 16, backgroundColor: "rgba(255,255,255,0.8)" }} />
      <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "white" }} />
    </div>
  );
};

export const World: React.FC = () => {
  const frame = useCurrentFrame();
  const fs = foldState(frame);
  const cam = camera(frame);
  const n = isTeaser(frame) ? 42 : camFold(frame);
  const p = makeProj(cam, frame, n);
  const sky = skyColors(cam.C);
  const wide = wideWeight(frame);
  const glow = glowAmount(p);
  const sh = shake(frame);
  const t = frame / 30;

  const labels: LabelSpec[] = [
    { text: "MUG · 9.5 cm", x: 0.075, alt: 0.11, show: windowed(n, 9.4, 11.4) },
    { text: "YOU · 1.7 m", x: 0.9, alt: 1.82, show: windowed(n, 13.6, 15.9) },
    { text: "HOUSE · 9 m", x: 8.5, alt: 9.8, show: windowed(n, 16.6, 18.7) },
    { text: "BURJ KHALIFA · 828 m", x: 430, alt: 845, show: windowed(n, 22.6, 24.8) },
    { text: "EVEREST · 8,849 m", x: 8000, alt: 8900, show: windowed(n, 26.6, 28.8) },
    { text: "SPACE STARTS · 100 km", x: 0, alt: 100_000, screenX: 700, show: windowed(n, 29.3, 32.2) },
    { text: "SPACE STATION · 408 km", x: 330_000 - (t - 19.5) * 32_000, alt: 418_000, show: windowed(n, 31.2, 34) },
    {
      text: "MOON",
      x: MOON_X,
      alt: MOON_ALT + MOON_R * 1.3 + 20 / p.ppm,
      show: Math.max(windowed(n, 38.5, 41.6), wide),
    },
    { text: "EARTH", x: 0, alt: -EARTH_R + 20 / p.ppm, screenX: p.sx(0) - 190, show: wide },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.bottom} 100%)`,
      }}
    >
      <AbsoluteFill style={{ translate: `${sh.x}px ${sh.y}px` }}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", overflow: "visible" }}>
          <Stars p={p} amount={sky.space} />
          <Moon p={p} wide={wide} />
          <Mountains p={p} />
          <Earth p={p} wide={wide} />
          <Clouds p={p} />
          <City p={p} />
          <Neighborhood p={p} />
          <Grass p={p} front={false} />
          <Mug p={p} />
          <KarmanLine p={p} />
          <ISS p={p} />
          <Plane p={p} />
          <Stack p={p} fs={fs} glow={glow} />
          <Person p={p} />
          <Grass p={p} front />
        </svg>
        {labels.map((l) => (
          <Label key={l.text} p={p} spec={l} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
