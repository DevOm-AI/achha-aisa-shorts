import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FrameCounter: React.FC = () => {
  const frame = useCurrentFrame();
  return <>{String(frame).padStart(3, "0")}</>;
};

const FrameSceneInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      <Interactive.Div
        name="Frame headline"
        style={{
          position: "absolute",
          top: 140,
          left: 150,
          fontFamily: "Inter",
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: -2.5,
          color: "#FFFFFF",
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Every frame is a function.
      </Interactive.Div>
      <Interactive.Div
        name="Code panel"
        style={{
          position: "absolute",
          top: 340,
          left: 150,
          width: 860,
          boxSizing: "border-box",
          padding: "44px 52px",
          borderRadius: 28,
          backgroundColor: "rgba(10,12,24,0.85)",
          border: "2px solid rgba(255,255,255,0.1)",
          fontFamily: "JetBrains Mono",
          fontSize: 40,
          lineHeight: 1.6,
          color: "#E3E7F5",
          whiteSpace: "pre",
          opacity: interpolate(frame, [0.3 * fps, 0.9 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0.3 * fps, 1.2 * fps], ["0px 60px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
          }),
        }}
      >
        <span style={{ color: "#FF6B9A" }}>const</span> frame ={" "}
        <span style={{ color: "#8FA8FF" }}>useCurrentFrame</span>();
        {"\n\n"}
        <span style={{ color: "#FF6B9A" }}>const</span> x ={" "}
        <span style={{ color: "#8FA8FF" }}>interpolate</span>(
        {"\n  "}frame,{"\n  "}[<span style={{ color: "#3DDC97" }}>15</span>,{" "}
        <span style={{ color: "#3DDC97" }}>105</span>],{"\n  "}[
        <span style={{ color: "#3DDC97" }}>0</span>,{" "}
        <span style={{ color: "#3DDC97" }}>560</span>]{"\n"});
      </Interactive.Div>
      <div
        style={{
          position: "absolute",
          top: 560,
          left: 1150,
          width: 620,
          height: 4,
          borderRadius: 2,
          backgroundColor: "rgba(255,255,255,0.15)",
        }}
      />
      <Interactive.Div
        name="Ball"
        style={{
          position: "absolute",
          top: 532,
          left: 1150,
          width: 60,
          height: 60,
          borderRadius: "50%",
          backgroundColor: "#4F7CFF",
          boxShadow: "0 0 60px rgba(79,124,255,0.8)",
          translate: interpolate(frame, [0.5 * fps, 3.5 * fps], ["0px 0px", "560px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.65, 0, 0.35, 1),
          }),
        }}
      />
      <Interactive.Div
        name="Frame counter"
        style={{
          position: "absolute",
          top: 660,
          left: 1150,
          fontFamily: "JetBrains Mono",
          fontSize: 56,
          color: "#B4BCD6",
          opacity: interpolate(frame, [0.6 * fps, 1.2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        frame{" "}
        <span style={{ color: "#FFFFFF", fontSize: 96, fontWeight: 500 }}>
          <FrameCounter />
        </span>
      </Interactive.Div>
    </>
  );
};

export const FrameScene = Interactive.create({
  Component: FrameSceneInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
