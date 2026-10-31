import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { foldState, formatHeight, isTeaser, T0 } from "./timeline";

export const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const fs = foldState(frame);
  const show = isTeaser(frame)
    ? 0
    : interpolate(frame, [90, 102, 884, 896], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (show <= 0) return null;
  const folds = Math.round(fs.n);
  const height = T0 * Math.pow(2, fs.n);
  const bump =
    fs.mode === "step" && fs.f > 0 ? Math.max(0, 1 - Math.abs(fs.f - 0.6) / 0.3) : fs.impact * 0.6;
  const progress = Math.min(1, fs.n / 42);

  return (
    <AbsoluteFill style={{ opacity: show }}>
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 92,
          fontFamily: "Montserrat",
          color: "white",
          textShadow: "0 4px 18px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, opacity: 0.85 }}>FOLDS</div>
        <div
          style={{
            fontSize: 124,
            fontWeight: 900,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            scale: String(1 + 0.16 * bump),
            transformOrigin: "0% 50%",
            color: folds >= 42 ? "#FFD60A" : "white",
          }}
        >
          {folds}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 60,
          top: 92,
          textAlign: "right",
          fontFamily: "Montserrat",
          color: "white",
          textShadow: "0 4px 18px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, opacity: 0.85 }}>HEIGHT</div>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.45, fontVariantNumeric: "tabular-nums" }}>
          {formatHeight(height)}
        </div>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 268, height: 14 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 7,
            backgroundColor: "rgba(255,255,255,0.22)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            borderRadius: 7,
            background: "linear-gradient(90deg, #FFD60A, #FF9F0A)",
            boxShadow: "0 0 16px rgba(255,214,10,0.7)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -14,
            top: -15,
            width: 44,
            height: 44,
            borderRadius: 22,
            background: "radial-gradient(circle at 35% 30%, #fffdf2, #cfc8b8 70%, #8f8a80)",
            boxShadow: progress >= 1 ? "0 0 30px 10px rgba(255,240,200,0.8)" : "0 0 10px rgba(255,255,255,0.4)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
