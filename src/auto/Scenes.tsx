import React from "react";
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Emoji } from "./Emoji";
import { SceneSpec } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Every scene has a second "punch" beat partway through, so nothing sits idle.
export const punchFrame = (dur: number) => Math.round(Math.max(14, Math.min(dur * 0.58, dur - 24)));
export const REVEAL_HIT = 10;
export const PUNCH_SCENES: SceneSpec["type"][] = ["counter", "compare", "race", "stack", "fact"];

const usePop = (delay = 0, damping = 11) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 140, mass: 0.8 } });
};

// Decaying camera shake starting at `at`.
const shake = (frame: number, at: number, strength = 22, len = 14) => {
  const t = frame - at;
  if (t < 0 || t > len) return "0px 0px";
  const d = 1 - t / len;
  return `${Math.sin(t * 2.7) * strength * d}px ${Math.cos(t * 3.3) * strength * d}px`;
};

// Squash & stretch after a landing: returns [scaleX, scaleY].
const squash = (sinceLand: number): [number, number] => {
  if (sinceLand < 0 || sinceLand > 14) return [1, 1];
  const k = 0.24 * Math.sin((sinceLand / 14) * Math.PI * 2) * (1 - sinceLand / 14);
  return [1 + k, 1 - k];
};

const textStyle = (size: number, color: string): React.CSSProperties => ({
  fontFamily: "Montserrat",
  fontWeight: 900,
  fontSize: size,
  lineHeight: 1.05,
  color,
  textAlign: "center",
  WebkitTextStroke: `${Math.round(size * 0.12)}px #000`,
  paintOrder: "stroke fill",
  textShadow: "0 10px 0 rgba(0,0,0,0.35)",
});

const BigText: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({
  children,
  size = 110,
  color = "#FFFFFF",
  style,
}) => <div style={{ ...textStyle(size, color), ...style }}>{children}</div>;

// Letters drop in one by one and slam down; optional RGB glitch at `glitchAt`.
const SlamText: React.FC<{ text: string; size: number; color?: string; delay?: number; glitchAt?: number }> = ({
  text,
  size,
  color = "#FFD60A",
  delay = 0,
  glitchAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glitch = glitchAt !== undefined && frame >= glitchAt && frame < glitchAt + 8;
  let idx = 0;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `0 ${size * 0.3}px`,
        translate: glitch ? `${(random(`g${frame}`) - 0.5) * 30}px 0px` : undefined,
      }}
    >
      {text.split(/\s+/).map((word, wi) => (
        <div key={wi} style={{ display: "flex" }}>
          {Array.from(word).map((ch) => {
            const i = idx++;
            const p = spring({ frame: frame - delay - i * 1.5, fps, config: { damping: 10, stiffness: 190, mass: 0.6 } });
            return (
              <span
                key={i}
                style={{
                  ...textStyle(size, color),
                  display: "inline-block",
                  opacity: Math.min(1, p * 3),
                  translate: `0px ${(1 - p) * -170}px`,
                  scale: String(1 + (1 - p) * 1.3),
                  rotate: `${(random(`r${i}`) - 0.5) * 50 * (1 - p)}deg`,
                  textShadow: glitch ? "-9px 0 #00e5ff, 9px 0 #ff2d95" : textStyle(size, color).textShadow,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// Emoji with depth: drop shadow, gentle 3D sway and float.
const Hero: React.FC<{ emoji: string; size: number; sway?: number }> = ({ emoji, size, sway = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        rotate: `y ${Math.sin(frame / 22) * 16 * sway}deg`,
        translate: `0px ${Math.sin(frame / 15) * 14 * sway}px`,
        filter: "drop-shadow(0 40px 28px rgba(0,0,0,0.5))",
      }}
    >
      <div style={{ rotate: `${Math.sin(frame / 27) * 4 * sway}deg` }}>
        <Emoji emoji={emoji} size={size} />
      </div>
    </div>
  );
};

const Rings: React.FC<{ at: number; color: string; size: number }> = ({ at, color, size }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {[0, 5, 10].map((d) => {
        const t = interpolate(frame, [at + d, at + d + 22], [0, 1], clamp);
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              borderRadius: "50%",
              border: `${14 - d}px solid ${color}`,
              scale: String(0.4 + t * 1.3),
              opacity: t === 0 ? 0 : 1 - t,
            }}
          />
        );
      })}
    </>
  );
};

// Confetti burst with gravity, emitted from the parent's center at frame `at`.
const Burst: React.FC<{ at: number; count?: number; power?: number; seed?: string }> = ({
  at,
  count = 26,
  power = 1,
  seed = "b",
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 40) return null;
  const colors = ["#FFD60A", "#ff2d95", "#00e5ff", "#7CFF6B", "#ffffff", "#ff8a00"];
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0 }}>
      {new Array(count).fill(0).map((_, i) => {
        const a = random(`${seed}a${i}`) * Math.PI * 2;
        const v = (14 + random(`${seed}v${i}`) * 20) * power;
        const x = Math.cos(a) * v * t;
        const y = Math.sin(a) * v * t + 0.9 * t * t;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 18,
              height: 30,
              borderRadius: 4,
              background: colors[i % colors.length],
              translate: `${x}px ${y}px`,
              rotate: `${t * (10 + random(`${seed}r${i}`) * 30)}deg`,
              opacity: interpolate(t, [26, 40], [1, 0], clamp),
            }}
          />
        );
      })}
    </div>
  );
};

const Flash: React.FC<{ at: number; strength?: number }> = ({ at, strength = 0.75 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 6], [strength, 0], clamp);
  if (frame < at || o <= 0) return null;
  return <div style={{ position: "absolute", inset: -400, background: "white", opacity: o }} />;
};

const Stage: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      position: "absolute",
      left: 60,
      right: 60,
      top: 220,
      height: 900,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 30,
      ...style,
    }}
  >
    {children}
  </div>
);

const formatIN = (v: number) =>
  Math.abs(v) < 100 && !Number.isInteger(v) ? v.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : Math.round(v).toLocaleString("en-IN");

const ratioBadge = (a: number, b: number, unit: string) => {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  const r = max / Math.max(min, 1e-9);
  if (r >= 2) return `${r >= 100 ? formatIN(Math.round(r)) : r.toFixed(r >= 10 ? 0 : 1).replace(/\.0$/, "")}× ZYADA!`;
  return `+${formatIN(max - min)} ${unit}`.trim();
};

// A stamp that slams onto the screen.
const Stamp: React.FC<{ at: number; text: string; color: string }> = ({ at, text, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 9, stiffness: 220, mass: 0.7 } });
  if (frame < at) return null;
  return (
    <div
      style={{
        padding: "10px 34px",
        borderRadius: 26,
        background: color,
        border: "8px solid #000",
        boxShadow: "0 14px 0 rgba(0,0,0,0.45)",
        rotate: "-7deg",
        scale: String(3 - 2 * p),
        opacity: Math.min(1, p * 2),
        whiteSpace: "nowrap",
      }}
    >
      <span style={textStyle(76, "#FFFFFF")}>{text}</span>
    </div>
  );
};

// ---------------------------------------------------------------- scenes

const Hook: React.FC<{ s: Extract<SceneSpec, { type: "hook" }>; accent: string; dur: number }> = ({ s, accent, dur }) => {
  const frame = useCurrentFrame();
  const land = 9;
  const fall = interpolate(frame, [0, land], [-1300, 0], { ...clamp, easing: Easing.in(Easing.quad) });
  const [sx, sy] = squash(frame - land);
  const push = interpolate(frame, [land, dur], [1, 1.12], clamp);
  const punch = punchFrame(dur);
  return (
    <Stage style={{ translate: shake(frame, land, 30, 14) }}>
      <SlamText text={s.big} size={108} delay={land + 3} glitchAt={punch} />
      <div style={{ position: "relative", width: 540, height: 540, translate: shake(frame, punch, 12, 10) }}>
        <Rings at={land} color={accent} size={540} />
        <div
          style={{
            position: "absolute",
            inset: 10,
            translate: `0px ${fall}px`,
            scale: `${sx * push} ${sy * push}`,
            transformOrigin: "50% 100%",
          }}
        >
          <Hero emoji={s.emoji} size={520} />
        </div>
        <Burst at={land} seed="hook" />
      </div>
      <Flash at={land} strength={0.5} />
    </Stage>
  );
};

const Counter: React.FC<{ s: Extract<SceneSpec, { type: "counter" }>; accent: string; dur: number }> = ({
  s,
  accent,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punch = punchFrame(dur);
  const pop = usePop();
  const t = interpolate(frame, [4, punch], [0, 1], clamp);
  const eased = 1 - Math.pow(1 - t, 3);
  const value = s.from + (s.to - s.from) * eased;
  const tick = 1 + 0.1 * Math.max(0, 1 - ((t * 12) % 1) * 4) * (t < 1 ? 1 : 0);
  const slam = spring({ frame: frame - punch, fps, config: { damping: 8, stiffness: 200 } });
  const numScale = frame < punch ? 1 : 1.45 - 0.45 * slam;
  const labelIn = usePop(8);
  const R = 230;
  const C = 2 * Math.PI * R;
  return (
    <Stage style={{ translate: shake(frame, punch, 24, 14) }}>
      <div style={{ position: "relative", width: 520, height: 520, scale: String(pop) }}>
        <svg width={520} height={520} style={{ position: "absolute", rotate: "-90deg" }}>
          <circle cx={260} cy={260} r={R} stroke="rgba(255,255,255,0.15)" strokeWidth={22} fill="none" />
          <circle
            cx={260}
            cy={260}
            r={R}
            stroke={accent}
            strokeWidth={22}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - eased)}
            style={{ filter: `drop-shadow(0 0 18px ${accent})` }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 90, scale: String(tick) }}>
          <Hero emoji={s.emoji} size={340} />
        </div>
        <Rings at={punch} color="#FFD60A" size={520} />
      </div>
      <div style={{ position: "relative" }}>
        <BigText
          size={150}
          color="#FFD60A"
          style={{
            fontVariantNumeric: "tabular-nums",
            scale: String(numScale),
            filter: `blur(${t < 1 ? (1 - t) * 4 : 0}px)`,
            whiteSpace: "nowrap",
          }}
        >
          {s.prefix ?? ""}
          {formatIN(value)}
          {s.suffix ?? ""}
        </BigText>
        <Burst at={punch} seed="count" />
      </div>
      <BigText size={62} style={{ opacity: labelIn, translate: `0px ${(1 - labelIn) * 60}px` }}>
        {s.label}
      </BigText>
    </Stage>
  );
};

const Compare: React.FC<{ s: Extract<SceneSpec, { type: "compare" }>; accent: string; dur: number }> = ({
  s,
  accent,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punch = punchFrame(dur);
  const max = Math.max(s.left.value, s.right.value, 1e-9);
  const grow = interpolate(frame, [8, punch - 4], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const leftIn = spring({ frame, fps, config: { damping: 13 } });
  const rightIn = spring({ frame: frame - 5, fps, config: { damping: 13 } });
  const vsPop = usePop(8, 7);
  const winnerLeft = s.left.value >= s.right.value;
  const after = frame >= punch;
  const crown = spring({ frame: frame - punch - 4, fps, config: { damping: 10 } });

  const side = (item: typeof s.left, enter: number, dir: number, color: string, isWinner: boolean) => {
    const h = Math.max(36, (item.value / max) * 400) * grow;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 400,
          translate: `${(1 - enter) * 700 * dir}px 0px`,
          filter: after && !isWinner ? "saturate(0.3) brightness(0.75)" : undefined,
          scale: after && isWinner ? String(1 + 0.06 * crown) : "1",
        }}
      >
        <div style={{ position: "relative" }}>
          {isWinner ? (
            <div
              style={{
                position: "absolute",
                left: 50,
                top: -90,
                translate: `0px ${(1 - crown) * -500}px`,
                opacity: crown,
                rotate: "-12deg",
              }}
            >
              <Emoji emoji="👑" size={110} />
            </div>
          ) : null}
          <Hero emoji={item.emoji} size={200} sway={0.6} />
        </div>
        <div style={{ height: 420, display: "flex", alignItems: "flex-end" }}>
          <div
            style={{
              width: 160,
              height: h,
              borderRadius: 26,
              background: `linear-gradient(180deg, ${color}, ${color}99)`,
              boxShadow: `0 0 50px ${color}`,
              border: "6px solid rgba(255,255,255,0.7)",
            }}
          />
        </div>
        <BigText size={58} color="#FFD60A" style={{ whiteSpace: "nowrap" }}>
          {formatIN(item.value * grow)} {s.unit}
        </BigText>
        <BigText size={44}>{item.label}</BigText>
      </div>
    );
  };
  return (
    <Stage style={{ translate: shake(frame, punch, 18, 12) }}>
      <div style={{ height: 120, display: "flex", alignItems: "center" }}>
        <Stamp at={punch} text={ratioBadge(s.left.value, s.right.value, s.unit)} color={accent} />
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {side(s.left, leftIn, -1, "#38bdf8", winnerLeft)}
        <BigText size={90} color={accent} style={{ scale: String(vsPop), rotate: `${Math.sin(frame / 6) * 8}deg`, WebkitTextStroke: "10px #fff" }}>
          VS
        </BigText>
        {side(s.right, rightIn, 1, "#f472b6", !winnerLeft)}
      </div>
    </Stage>
  );
};

const Race: React.FC<{ s: Extract<SceneSpec, { type: "race" }>; accent: string; dur: number }> = ({ s, accent, dur }) => {
  const frame = useCurrentFrame();
  const punch = punchFrame(dur);
  const max = Math.max(s.left.value, s.right.value, 1e-9);
  const TRACK = 760;
  const t = interpolate(frame, [10, punch], [0, 1], clamp);
  const lanes = [
    { item: s.left, color: "#38bdf8" },
    { item: s.right, color: "#f472b6" },
  ];
  return (
    <Stage style={{ translate: shake(frame, punch, 16, 12), gap: 50 }}>
      <SlamText text="RACE!" size={90} color={accent} delay={0} />
      {lanes.map(({ item, color }, li) => {
        const speed = item.value / max;
        const x = TRACK * t * Math.max(speed, 0.02);
        const moving = t > 0 && t < 1;
        const winner = speed === 1;
        const bob = moving ? -Math.abs(Math.sin(frame / (winner ? 2.2 : 5))) * 24 : 0;
        return (
          <div key={li} style={{ width: 960 }}>
            <BigText size={50} style={{ textAlign: "left", marginBottom: 8 }}>
              {item.label} · <span style={{ color: "#FFD60A" }}>{formatIN(item.value)} {s.unit}</span>
            </BigText>
            <div
              style={{
                position: "relative",
                height: 200,
                borderRadius: 30,
                background: "rgba(0,0,0,0.35)",
                border: `5px solid ${color}`,
                overflow: "visible",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: 40,
                  top: 0,
                  bottom: 0,
                  width: 26,
                  background: "repeating-linear-gradient(0deg, #fff 0 20px, #000 20px 40px)",
                }}
              />
              {winner && moving
                ? [0, 1, 2, 3].map((k) => (
                    <div
                      key={k}
                      style={{
                        position: "absolute",
                        left: Math.max(0, x - 120 - k * 30),
                        top: 50 + k * 30,
                        width: 140,
                        height: 10,
                        borderRadius: 5,
                        background: "rgba(255,255,255,0.6)",
                        opacity: 0.8 - k * 0.15,
                      }}
                    />
                  ))
                : null}
              <div style={{ position: "absolute", left: x, top: 10, translate: `0px ${bob}px`, scale: "-1 1" }}>
                <Emoji emoji={item.emoji} size={180} style={{ filter: "drop-shadow(0 20px 14px rgba(0,0,0,0.5))" }} />
              </div>
              {winner ? (
                <div style={{ position: "absolute", right: 60, top: "50%" }}>
                  <Burst at={punch} seed="race" count={30} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <div style={{ height: 110 }}>
        <Stamp at={punch} text={ratioBadge(s.left.value, s.right.value, s.unit).replace("ZYADA", "TEZ")} color={accent} />
      </div>
    </Stage>
  );
};

const Orbit: React.FC<{ s: Extract<SceneSpec, { type: "orbit" }>; accent: string; dur: number }> = ({ s, accent, dur }) => {
  const frame = useCurrentFrame();
  const centerPop = usePop(0, 9);
  const RX = 420;
  const RY = 150;
  const pos = (f: number) => {
    const a = f / 14 + Math.PI / 2;
    return { x: Math.cos(a) * RX, y: Math.sin(a) * RY, front: Math.sin(a) > 0, depth: 0.7 + 0.3 * Math.sin(a) };
  };
  const now = pos(frame);
  const orbiterIn = interpolate(frame, [4, 16], [0, 1], clamp);
  const orbiter = (
    <div
      style={{
        position: "absolute",
        left: 450 + now.x - 95,
        top: 360 + now.y - 95,
        scale: String(now.depth * orbiterIn),
        zIndex: now.front ? 3 : 1,
      }}
    >
      <Emoji emoji={s.orbiter.emoji} size={190} style={{ filter: "drop-shadow(0 16px 10px rgba(0,0,0,0.5))" }} />
    </div>
  );
  return (
    <Stage>
      <SlamText text={s.big} size={96} delay={6} glitchAt={punchFrame(dur)} />
      <div style={{ position: "relative", width: 900, height: 720, rotate: "-8deg" }}>
        <svg width={900} height={720} style={{ position: "absolute", zIndex: 0 }}>
          <ellipse cx={450} cy={360} rx={RX} ry={RY} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={5} strokeDasharray="14 14" />
          {new Array(14).fill(0).map((_, k) => {
            const p = pos(frame - (k + 1) * 0.9);
            return <circle key={k} cx={450 + p.x} cy={360 + p.y} r={16 - k} fill={accent} opacity={(0.6 - k * 0.04) * orbiterIn} />;
          })}
        </svg>
        <div
          style={{
            position: "absolute",
            left: 450 - 200,
            top: 360 - 200,
            zIndex: 2,
            scale: String(centerPop),
            rotate: `${frame * 0.6}deg`,
            filter: `drop-shadow(0 0 50px ${accent})`,
          }}
        >
          <Emoji emoji={s.center.emoji} size={400} />
        </div>
        {orbiter}
        <div style={{ position: "absolute", left: 0, right: 0, top: 600, zIndex: 4 }}>
          <BigText size={48}>
            {s.orbiter.label} ↻ {s.center.label}
          </BigText>
        </div>
      </div>
    </Stage>
  );
};

const Stack: React.FC<{ s: Extract<SceneSpec, { type: "stack" }>; accent: string; dur: number }> = ({ s, accent, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punch = punchFrame(dur);
  const n = Math.max(1, Math.min(Math.round(s.count), 48));
  const cols = n <= 9 ? 3 : n <= 20 ? 5 : n <= 30 ? 6 : 8;
  const rows = Math.ceil(n / cols);
  const cell = Math.min(900 / cols, 560 / rows);
  const step = Math.max(0.6, (punch - 10) / n);
  const landed = Math.min(n, Math.max(0, Math.floor((frame - 8) / step)));
  const shown = n === s.count ? landed : Math.round((landed / n) * s.count);
  const slam = spring({ frame: frame - punch, fps, config: { damping: 8, stiffness: 200 } });
  return (
    <Stage style={{ translate: shake(frame, punch, 20, 12) }}>
      <div style={{ position: "relative", width: cols * cell, height: rows * cell }}>
        {new Array(n).fill(0).map((_, i) => {
          // Fill from the bottom row up, like a pile.
          const r = rows - 1 - Math.floor(i / cols);
          const c = i % cols;
          const t0 = 8 + i * step;
          const fall = interpolate(frame, [t0, t0 + 8], [-1400, 0], { ...clamp, easing: Easing.in(Easing.quad) });
          const [sx, sy] = squash(frame - t0 - 8);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: c * cell,
                top: r * cell,
                translate: `0px ${fall}px`,
                scale: `${sx} ${sy}`,
                transformOrigin: "50% 100%",
                opacity: frame < t0 ? 0 : 1,
              }}
            >
              <Emoji emoji={s.emoji} size={cell * 0.92} style={{ filter: "drop-shadow(0 8px 6px rgba(0,0,0,0.45))" }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative" }}>
        <BigText
          size={140}
          color="#FFD60A"
          style={{ fontVariantNumeric: "tabular-nums", scale: String(frame < punch ? 1 : 1.4 - 0.4 * slam) }}
        >
          × {formatIN(frame < punch ? shown : s.count)}
        </BigText>
        <Burst at={punch} seed="stack" />
      </div>
      <BigText size={58} style={{ color: "white", textShadow: `0 0 30px ${accent}` }}>
        {s.label}
      </BigText>
    </Stage>
  );
};

const Grow: React.FC<{ s: Extract<SceneSpec, { type: "grow" }>; dur: number }> = ({ s, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = s.items.slice(0, 4);
  const step = Math.max(8, Math.floor((dur * 0.75) / items.length));
  // Smoothly animated "camera position" along the row of items.
  let cam = 0;
  for (let i = 1; i < items.length; i++) cam += spring({ frame: frame - i * step, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <Stage>
      <div style={{ position: "relative", width: 900, height: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {items.map((it, i) => {
          const p = spring({ frame: frame - i * step, fps, config: { damping: 9 } });
          const w = Math.max(0, 1 - Math.abs(i - cam));
          const size = 170 + i * 85;
          const [sx, sy] = squash(frame - i * step - 6);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                scale: String(p * (0.5 + 0.5 * w)),
                translate: `${(i - cam) * 360}px ${(1 - w) * 140}px`,
                opacity: 0.45 + 0.55 * w,
                filter: w < 0.5 ? "blur(2px)" : undefined,
              }}
            >
              <div style={{ scale: `${sx} ${sy}`, transformOrigin: "50% 100%" }}>
                <Hero emoji={it.emoji} size={size} sway={0.5} />
              </div>
              <BigText size={64} style={{ marginTop: 14, whiteSpace: "nowrap" }}>
                {it.label}
              </BigText>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

const List: React.FC<{ s: Extract<SceneSpec, { type: "list" }>; accent: string; dur: number }> = ({ s, accent, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = s.items.slice(0, 3);
  const step = Math.max(6, Math.floor((dur * 0.55) / items.length));
  const active = Math.min(items.length - 1, Math.floor(frame / step));
  const landings = items.map((_, i) => i * step + 6);
  const shakeAt = landings.filter((l) => l <= frame).pop() ?? -100;
  return (
    <Stage style={{ translate: shake(frame, shakeAt, 10, 8) }}>
      {items.map((it, i) => {
        const p = spring({ frame: frame - i * step, fps, config: { damping: 11, stiffness: 160 } });
        const isActive = i === active;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 30,
              width: 920,
              padding: "24px 36px",
              borderRadius: 36,
              background: isActive ? `${accent}cc` : "rgba(0,0,0,0.4)",
              border: `5px solid ${isActive ? "#FFD60A" : "rgba(255,255,255,0.18)"}`,
              boxShadow: isActive ? `0 0 50px ${accent}` : undefined,
              opacity: Math.min(1, p * 2),
              scale: String((1 + (1 - p) * 0.8) * (isActive ? 1.04 : 0.96)),
              rotate: `${(1 - p) * (i % 2 ? 10 : -10)}deg`,
            }}
          >
            <div style={{ rotate: `${(1 - p) * 360}deg` }}>
              <Emoji emoji={it.emoji} size={150} />
            </div>
            <BigText size={60} style={{ textAlign: "left" }}>
              {it.text}
            </BigText>
          </div>
        );
      })}
    </Stage>
  );
};

const Fact: React.FC<{ s: Extract<SceneSpec, { type: "fact" }>; accent: string; dur: number }> = ({ s, accent, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punch = punchFrame(dur);
  const flip = spring({ frame, fps, config: { damping: 12, stiffness: 90 } });
  const chars = Math.floor(interpolate(frame, [16, 16 + s.small.length * 1.2], [0, s.small.length], clamp));
  const sweep = interpolate(frame, [punch, punch + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <Stage style={{ translate: shake(frame, punch, 16, 10) }}>
      <div style={{ rotate: `y ${(1 - flip) * 180}deg`, scale: String(0.3 + 0.7 * flip) }}>
        <Hero emoji={s.emoji} size={400} />
      </div>
      <div style={{ position: "relative" }}>
        <SlamText text={s.big} size={124} delay={6} glitchAt={punch} />
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: -18,
            height: 18,
            borderRadius: 9,
            width: `${sweep * 100}%`,
            background: accent,
            boxShadow: `0 0 30px ${accent}`,
          }}
        />
      </div>
      <BigText size={58}>
        {s.small.slice(0, chars)}
        <span style={{ opacity: chars < s.small.length && frame % 10 < 5 ? 1 : 0 }}>|</span>
      </BigText>
    </Stage>
  );
};

const Reveal: React.FC<{ s: Extract<SceneSpec, { type: "reveal" }>; accent: string }> = ({ s, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hit = REVEAL_HIT;
  const before = frame < hit;
  const boom = spring({ frame: frame - hit, fps, config: { damping: 7, stiffness: 150 } });
  const tremble = before ? `${(random(`t${frame}`) - 0.5) * 16}px ${(random(`u${frame}`) - 0.5) * 16}px` : "0px 0px";
  const emojiScale = before ? interpolate(frame, [0, hit], [0.25, 0.4], clamp) : 0.4 + 0.6 * boom;
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 40%, transparent 20%, rgba(0,0,0,0.85) 70%)",
          opacity: interpolate(frame, [0, hit, hit + 20], [0, 1, 0.5], clamp),
        }}
      />
      <Stage style={{ translate: shake(frame, hit, 34, 18) }}>
        <div style={{ position: "relative", width: 640, height: 640 }}>
          <div
            style={{
              position: "absolute",
              inset: -300,
              background: `repeating-conic-gradient(from ${frame * 1.5}deg, #FFD60A88 0deg 9deg, transparent 10deg 24deg)`,
              borderRadius: "50%",
              maskImage: "radial-gradient(circle, black 25%, transparent 68%)",
              WebkitMaskImage: "radial-gradient(circle, black 25%, transparent 68%)",
              opacity: before ? 0 : boom,
            }}
          />
          <Rings at={hit} color="#FFD60A" size={640} />
          <div style={{ position: "absolute", inset: 60, scale: String(emojiScale), translate: tremble }}>
            <Hero emoji={s.emoji} size={520} sway={1.3} />
          </div>
          <Burst at={hit} count={44} power={1.3} seed="rev" />
        </div>
        <SlamText text={s.big} size={116} delay={hit + 4} glitchAt={hit + 16} />
      </Stage>
      <Flash at={hit} strength={0.9} />
    </>
  );
};

export const SceneView: React.FC<{ spec: SceneSpec; accent: string; dur: number }> = ({ spec, accent, dur }) => {
  switch (spec.type) {
    case "hook":
      return <Hook s={spec} accent={accent} dur={dur} />;
    case "counter":
      return <Counter s={spec} accent={accent} dur={dur} />;
    case "compare":
      return <Compare s={spec} accent={accent} dur={dur} />;
    case "race":
      return <Race s={spec} accent={accent} dur={dur} />;
    case "orbit":
      return <Orbit s={spec} accent={accent} dur={dur} />;
    case "stack":
      return <Stack s={spec} accent={accent} dur={dur} />;
    case "grow":
      return <Grow s={spec} dur={dur} />;
    case "list":
      return <List s={spec} accent={accent} dur={dur} />;
    case "fact":
      return <Fact s={spec} accent={accent} dur={dur} />;
    case "reveal":
      return <Reveal s={spec} accent={accent} />;
  }
};
