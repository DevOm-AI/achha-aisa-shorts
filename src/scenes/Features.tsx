import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FeatureCard } from "../FeatureCard";

const FeaturesInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      <Interactive.Div
        name="Features headline"
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
          translate: interpolate(frame, [0, 0.8 * fps], ["-40px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Everything is a component.
      </Interactive.Div>
      <FeatureCard
        name="Compose card"
        index="01"
        title="Compose"
        body="Lay out scenes with JSX, CSS and any npm package."
        accent="#4F7CFF"
        style={{
          left: 150,
          top: 420,
          opacity: interpolate(frame, [0.4 * fps, 0.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0.4 * fps, 1.3 * fps], ["0px 80px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
          }),
        }}
      />
      <FeatureCard
        name="Animate card"
        index="02"
        title="Animate"
        body="Drive every property from the current frame."
        accent="#FF6B9A"
        style={{
          left: 710,
          top: 420,
          opacity: interpolate(frame, [0.7 * fps, 1.1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0.7 * fps, 1.6 * fps], ["0px 80px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
          }),
        }}
      />
      <FeatureCard
        name="Render card"
        index="03"
        title="Render"
        body="Export to MP4 locally, on a server or in the cloud."
        accent="#3DDC97"
        style={{
          left: 1270,
          top: 420,
          opacity: interpolate(frame, [1 * fps, 1.4 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [1 * fps, 1.9 * fps], ["0px 80px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
          }),
        }}
      />
    </>
  );
};

export const Features = Interactive.create({
  Component: FeaturesInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
