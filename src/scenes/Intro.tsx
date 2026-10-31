import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const IntroInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      <Interactive.Div
        name="Eyebrow"
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 32,
          fontWeight: 500,
          letterSpacing: 6,
          color: "#8FA8FF",
          padding: "14px 32px",
          borderRadius: 999,
          border: "2px solid rgba(143,168,255,0.4)",
          marginBottom: 56,
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0, 0.8 * fps], ["0px 30px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        MADE WITH REMOTION
      </Interactive.Div>
      <Interactive.Div
        name="Headline"
        style={{
          fontFamily: "Inter",
          fontSize: 150,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -4,
          color: "#FFFFFF",
          textAlign: "center",
          opacity: interpolate(frame, [0.2 * fps, 0.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [0.2 * fps, 1.4 * fps], [0.85, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        Videos, written
        <br />
        in React.
      </Interactive.Div>
      <Interactive.Div
        name="Subtitle"
        style={{
          fontFamily: "Inter",
          fontSize: 48,
          fontWeight: 400,
          color: "#B4BCD6",
          marginTop: 48,
          opacity: interpolate(frame, [1 * fps, 1.6 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [1 * fps, 1.8 * fps], ["0px 24px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Components in. MP4 out.
      </Interactive.Div>
    </>
  );
};

export const Intro = Interactive.create({
  Component: IntroInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
