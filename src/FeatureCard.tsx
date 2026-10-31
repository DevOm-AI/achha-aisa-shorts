import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type FeatureCardProps = {
  readonly index: string;
  readonly title: string;
  readonly body: string;
  readonly accent: string;
  readonly style?: React.CSSProperties;
};

const FeatureCardInner: React.FC<FeatureCardProps> = ({
  index,
  title,
  body,
  accent,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        width: 500,
        height: 440,
        boxSizing: "border-box",
        padding: 48,
        borderRadius: 32,
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "2px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 32,
          color: accent,
          marginBottom: 28,
        }}
      >
        {index}
      </div>
      <div
        style={{
          fontFamily: "Inter",
          fontSize: 64,
          fontWeight: 800,
          color: "#FFFFFF",
          letterSpacing: -1.5,
          marginBottom: 20,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "Inter",
          fontSize: 40,
          lineHeight: 1.35,
          color: "#B4BCD6",
        }}
      >
        {body}
      </div>
      <div
        style={{
          position: "absolute",
          left: 48,
          bottom: 40,
          height: 6,
          borderRadius: 3,
          backgroundColor: accent,
          width: interpolate(frame, [1.4 * fps, 2.2 * fps], [0, 120], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      />
    </div>
  );
};

export const FeatureCard = Interactive.create({
  Component: FeatureCardInner,
  layout: "none",
  schema: {
    index: { type: "string", default: "01", description: "Index" },
    title: { type: "string", default: "Title", description: "Title" },
    body: { type: "string", default: "", description: "Body" },
    accent: { type: "color", default: "#4F7CFF", description: "Accent color" },
  },
});
