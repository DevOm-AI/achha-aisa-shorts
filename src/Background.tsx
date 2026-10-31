import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0D17", overflow: "hidden" }}>
      <Interactive.Div
        name="Blue glow"
        style={{
          position: "absolute",
          width: 1400,
          height: 1400,
          left: -300,
          top: -500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(79,124,255,0.35) 0%, rgba(79,124,255,0) 65%)",
          translate: interpolate(
            frame,
            [0, durationInFrames],
            ["0px 0px", "500px 200px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.45, 0, 0.55, 1),
            },
          ),
        }}
      />
      <Interactive.Div
        name="Pink glow"
        style={{
          position: "absolute",
          width: 1200,
          height: 1200,
          left: 1000,
          top: 300,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,107,154,0.22) 0%, rgba(255,107,154,0) 65%)",
          translate: interpolate(
            frame,
            [0, durationInFrames],
            ["0px 0px", "-400px -150px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.45, 0, 0.55, 1),
            },
          ),
        }}
      />
    </AbsoluteFill>
  );
};
