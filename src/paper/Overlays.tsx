import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { climbRate } from "./timeline";

const LINES = new Array(46).fill(0).map((_, i) => ({
  x: random(`lx${i}`) * 1080,
  y: random(`ly${i}`) * 2400,
  len: 160 + random(`ll${i}`) * 520,
  w: 2 + random(`lw${i}`) * 4,
  speed: 0.7 + random(`ls${i}`) * 0.8,
}));

// Streaks that rush past while the camera climbs quickly (reversed when rewinding).
export const SpeedLines: React.FC = () => {
  const frame = useCurrentFrame();
  const rate = climbRate(frame);
  const intensity = Math.min(1, Math.max(0, (Math.abs(rate) - 1.5) / 7));
  if (intensity <= 0.01) return null;
  const dir = rate >= 0 ? 1 : -1;
  return (
    <AbsoluteFill style={{ opacity: intensity * 0.75 }}>
      <svg width={1080} height={1920}>
        {LINES.map((l, i) => {
          const travel = (l.y + frame * 140 * l.speed) % 2400;
          const y = dir > 0 ? travel - l.len : 1920 - travel;
          return <rect key={i} x={l.x} y={y} width={l.w} height={l.len} rx={l.w / 2} fill="white" opacity={0.35} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const Shade: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.12) 22%, rgba(0,0,0,0) 34%)",
      }}
    />
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)",
      }}
    />
  </AbsoluteFill>
);

export const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = Math.max(
    interpolate(frame, [37, 38, 44], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(frame, [75, 76, 82], [0, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(frame, [732, 733, 743], [0, 0.95, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  if (opacity <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: "white", opacity }} />;
};

// VHS-style rewind treatment while the folds run backwards.
export const RewindFx: React.FC = () => {
  const frame = useCurrentFrame();
  const amount = interpolate(frame, [804, 808, 836, 840], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (amount <= 0) return null;
  const bars = [0, 1, 2].map((i) => ({
    y: random(`rb${i}-${frame}`) * 1920,
    h: 10 + random(`rh${i}-${frame}`) * 40,
  }));
  return (
    <AbsoluteFill style={{ opacity: amount }}>
      <AbsoluteFill style={{ backgroundColor: "rgba(60,20,120,0.22)", mixBlendMode: "multiply" }} />
      <AbsoluteFill
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 2px, transparent 2px, transparent 6px)",
        }}
      />
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: b.y,
            height: b.h,
            backgroundColor: "rgba(255,255,255,0.18)",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1180,
          textAlign: "center",
          fontFamily: "Montserrat",
          fontWeight: 900,
          fontSize: 88,
          color: "white",
          WebkitTextStroke: "12px #000",
          paintOrder: "stroke fill",
          opacity: Math.floor(frame / 6) % 2 === 0 ? 1 : 0.55,
        }}
      >
        ◀◀ REWIND
      </div>
    </AbsoluteFill>
  );
};
