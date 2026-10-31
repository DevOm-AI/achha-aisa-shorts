import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const Typewriter: React.FC<{ readonly text: string; readonly startFrame: number }> = ({
  text,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const typed = Math.max(0, Math.min(text.length, Math.floor((frame - startFrame) * 0.9)));
  const caretVisible = Math.floor(frame / 15) % 2 === 0;

  return (
    <>
      {text.slice(0, typed)}
      <span style={{ opacity: caretVisible ? 1 : 0, color: "#4F7CFF" }}>▍</span>
    </>
  );
};

const OutroInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      <Interactive.Div
        name="Outro headline"
        style={{
          fontFamily: "Inter",
          fontSize: 140,
          fontWeight: 800,
          letterSpacing: -4,
          color: "#FFFFFF",
          marginBottom: 64,
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [0, 1 * fps], [0.9, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        Start building.
      </Interactive.Div>
      <Interactive.Div
        name="Command pill"
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 56,
          fontWeight: 500,
          color: "#E3E7F5",
          padding: "28px 56px",
          minWidth: 900,
          boxSizing: "border-box",
          borderRadius: 24,
          backgroundColor: "rgba(10,12,24,0.85)",
          border: "2px solid rgba(79,124,255,0.5)",
          opacity: interpolate(frame, [0.3 * fps, 0.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span style={{ color: "#3DDC97" }}>$ </span>
        <Typewriter text="npx create-video@latest" startFrame={20} />
      </Interactive.Div>
    </>
  );
};

export const Outro = Interactive.create({
  Component: OutroInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
