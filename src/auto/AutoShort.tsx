import { Audio } from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  CalculateMetadataFunction,
  interpolate,
  random,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "../fonts";
import { PUNCH_SCENES, punchFrame, REVEAL_HIT, SceneView } from "./Scenes";
import { AutoShortProps, Line } from "./types";

export const calculateAutoShortMetadata: CalculateMetadataFunction<AutoShortProps> = ({ props }) => ({
  durationInFrames: Math.max(30, props.lines.reduce((sum, l) => sum + l.durationInFrames, 0)),
});

const PARTICLES = new Array(36).fill(0).map((_, i) => ({
  x: random(`px${i}`) * 1080,
  y: random(`py${i}`) * 1920,
  r: 4 + random(`pr${i}`) * 14,
  speed: 0.6 + random(`ps${i}`) * 1.6,
}));

const Background: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, ${accent} 0%, #120a2a 55%, #05030d 100%)` }}>
      <AbsoluteFill
        style={{
          background:
            "repeating-conic-gradient(from 0deg at 50% 38%, rgba(255,255,255,0.06) 0deg 8deg, transparent 8deg 22deg)",
          rotate: `${frame * 0.25}deg`,
          scale: "2",
        }}
      />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {PARTICLES.map((p, i) => (
          <circle
            key={i}
            cx={p.x + Math.sin(frame / 30 + i) * 20}
            cy={(p.y - frame * p.speed * 3 + 1920 * 4) % 1920}
            r={p.r}
            fill="white"
            opacity={0.12}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

const clean = (w: string) => w.replace(/[^\p{L}\p{N}']/gu, "").toLowerCase();

// Shows 3 words at a time; the word being spoken gets a colored box.
const Captions: React.FC<{ line: Line; accent: string }> = ({ line, accent }) => {
  const frame = useCurrentFrame();
  const words = line.text.split(/\s+/).filter(Boolean);
  const hl = new Set(line.highlight.split(/\s+/).map(clean).filter(Boolean));
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  // Spread words over the actual voiced segments (skipping breaths/pauses) when we have them.
  const segs: [number, number][] = line.speech?.length ? line.speech : [[0, line.durationInFrames * 0.88]];
  const voiced = segs.reduce((a, [s, e]) => a + (e - s), 0);
  const at = (frac: number) => {
    let need = frac * voiced;
    for (const [s, e] of segs) {
      if (need <= e - s) return s + need;
      need -= e - s;
    }
    return segs[segs.length - 1][1];
  };
  let acc = 0;
  // Exact per-word start frames (from TTS alignment) win over the estimate.
  const starts =
    line.wordStarts?.length === words.length
      ? line.wordStarts
      : weights.map((w) => {
          const s = at(acc / total);
          acc += w;
          return s;
        });
  let current = 0;
  starts.forEach((s, i) => {
    if (frame >= s) current = i;
  });
  const chunkStart = Math.floor(current / 3) * 3;
  const chunk = words.slice(chunkStart, chunkStart + 3);
  const chunkPop = interpolate(frame - starts[chunkStart], [0, 5], [0.7, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 1180,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "10px 22px",
        scale: String(chunkPop),
      }}
    >
      {chunk.map((w, j) => {
        const i = chunkStart + j;
        const active = i === current;
        return (
          <span
            key={i}
            style={{
              fontFamily: "Montserrat",
              fontWeight: 900,
              fontSize: 96,
              lineHeight: 1.15,
              color: hl.has(clean(w)) ? "#FFD60A" : "#FFFFFF",
              WebkitTextStroke: "13px #000",
              paintOrder: "stroke fill",
              padding: "0 14px",
              borderRadius: 18,
              backgroundColor: active ? accent : "transparent",
              scale: active ? "1.1" : "1",
              textShadow: "0 8px 0 rgba(0,0,0,0.4)",
            }}
          >
            {w.toUpperCase()}
          </span>
        );
      })}
    </div>
  );
};

// Each scene enters differently so cuts never feel repetitive.
const ENTRANCES = ["whipLeft", "zoomThrough", "whipUp", "spin"] as const;

const SceneFrame: React.FC<{ line: Line; accent: string; index: number }> = ({ line, accent, index }) => {
  const frame = useCurrentFrame();
  const dur = line.durationInFrames;
  const kind = index === 0 ? null : ENTRANCES[(index - 1) % ENTRANCES.length];
  const t = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const blur = (1 - t) * 18;
  const enter: React.CSSProperties =
    kind === "whipLeft"
      ? { translate: `${(1 - t) * 1100}px 0px`, filter: `blur(${blur}px)` }
      : kind === "zoomThrough"
        ? { scale: String(1.8 - 0.8 * t), filter: `blur(${blur}px)`, opacity: t }
        : kind === "whipUp"
          ? { translate: `0px ${(1 - t) * 1500}px`, filter: `blur(${blur}px)` }
          : kind === "spin"
            ? { rotate: `${(1 - t) * -25}deg`, scale: String(0.4 + 0.6 * t), opacity: t }
            : {};
  // Slow camera push + drift for the whole scene.
  const push = interpolate(frame, [0, dur], [1, 1.07], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = Math.sin((frame + index * 40) / 45) * 0.8;
  const flash = index === 0 ? 0 : interpolate(frame, [0, 5], [0.45, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={enter}>
        <AbsoluteFill style={{ scale: String(push), rotate: `${drift}deg` }}>
          <SceneView spec={line.scene} accent={accent} dur={dur} />
        </AbsoluteFill>
      </AbsoluteFill>
      <Captions line={line} accent={accent} />
      {flash > 0 ? <AbsoluteFill style={{ backgroundColor: "white", opacity: flash }} /> : null}
    </AbsoluteFill>
  );
};

const Progress: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 14, background: "rgba(255,255,255,0.15)" }}>
      <div
        style={{
          height: "100%",
          width: `${(frame / (durationInFrames - 1)) * 100}%`,
          background: `linear-gradient(90deg, ${accent}, #FFD60A)`,
        }}
      />
    </div>
  );
};

export const AutoShort: React.FC<AutoShortProps> = ({ accent, lines, voice, voiceTrimBefore }) => {
  let from = 0;
  const starts = lines.map((l) => {
    const s = from;
    from += l.durationInFrames;
    return s;
  });
  return (
    <AbsoluteFill style={{ backgroundColor: "#05030d" }}>
      <Background accent={accent} />
      {lines.map((line, i) => (
        <Sequence key={i} name={`Line ${i + 1}`} from={starts[i]} durationInFrames={line.durationInFrames}>
          <SceneFrame line={line} accent={accent} index={i} />
          {i > 0 ? <Audio src={staticFile("sfx/whoosh.wav")} volume={0.35} /> : null}
          {i === 0 ? (
            <Sequence from={9} layout="none">
              <Audio src={staticFile("music/boom.wav")} volume={0.4} />
            </Sequence>
          ) : null}
          {line.scene.type === "reveal" ? (
            <Sequence from={REVEAL_HIT} layout="none">
              <Audio src={staticFile("music/boom.wav")} volume={0.5} />
            </Sequence>
          ) : null}
          {PUNCH_SCENES.includes(line.scene.type) ? (
            <Sequence from={punchFrame(line.durationInFrames)} layout="none">
              <Audio src={staticFile("sfx/whip.wav")} volume={0.35} />
            </Sequence>
          ) : null}
        </Sequence>
      ))}
      <Progress accent={accent} />
      <Audio name="Music pad" src={staticFile("music/pad.wav")} volume={0.1} loop />
      <Audio name="Music kick" src={staticFile("music/kick.wav")} volume={0.14} loop />
      {voice ? <Audio name="Voice" src={staticFile(voice)} trimBefore={voiceTrimBefore} volume={1} /> : null}
    </AbsoluteFill>
  );
};
