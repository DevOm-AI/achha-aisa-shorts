import { linearTiming, springTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Background } from "./Background";
import "./fonts";
import { Features } from "./scenes/Features";
import { FrameScene } from "./scenes/FrameScene";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";

// 4 + 4.5 + 4.5 + 3.5 seconds of scenes, minus three 15-frame transitions = 450 frames.
export const Main: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Background />
      <TransitionSeries>
        <TransitionSeries.Sequence name="Intro" durationInFrames={4 * fps}>
          <Intro
            name="Intro scene"
            style={{
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            }}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence name="Features" durationInFrames={4.5 * fps}>
          <Features name="Features scene" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence name="Frame" durationInFrames={4.5 * fps}>
          <FrameScene name="Frame scene" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence name="Outro" durationInFrames={3.5 * fps}>
          <Outro
            name="Outro scene"
            style={{
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            }}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
