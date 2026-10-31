import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, interpolate, staticFile, Track, useCurrentFrame } from "remotion";
import "../fonts";
import { Caption } from "./Caption";
import { Hud } from "./Hud";
import { Flash, RewindFx, Shade, SpeedLines } from "./Overlays";
import { foldLandings } from "./timeline";
import { World } from "./World";

const LANDINGS = foldLandings().filter((l) => l.fold > 3);

const Music: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <Audio
        name="Pad"
        src={staticFile("music/pad.wav")}
        volume={interpolate(frame, [0, 10, 700, 726, 840, 856], [0.18, 0.28, 0.28, 0, 0, 0.22], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <Audio
        name="Kick"
        from={96}
        src={staticFile("music/kick.wav")}
        volume={interpolate(frame, [96, 100, 712, 726], [0, 0.42, 0.42, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <Audio
        name="Hats"
        from={261}
        src={staticFile("music/hat.wav")}
        volume={interpolate(frame, [261, 265, 712, 726], [0, 0.25, 0.25, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <Audio name="Riser" from={618} src={staticFile("music/riser.wav")} volume={0.6} />
      <Audio name="Boom" from={732} src={staticFile("music/boom.wav")} volume={0.8} />
      <Audio name="Moon swell" from={732} src={staticFile("music/moon.wav")} volume={0.7} />
    </>
  );
};

export const PaperToMoon: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <World />
      <SpeedLines />
      <Shade />
      <Hud />
      <Track name="Captions">
        <Caption name="Hook" from={0} durationInFrames={37} highlight="42 TIMES">
          FOLD THIS PAPER 42 TIMES
        </Caption>
        <Caption name="Hook payoff" from={37} durationInFrames={38} highlight="THE MOON">
          …AND IT REACHES THE MOON
        </Caption>
        <Caption name="Doubt" from={75} durationInFrames={24} highlight="WATCH.">
          SOUNDS FAKE? WATCH.
        </Caption>
        <Caption name="Doubling" from={105} durationInFrames={81} highlight="DOUBLES">
          EVERY FOLD DOUBLES IT
        </Caption>
        <Caption name="10 folds" from={252} durationInFrames={48} highlight="MUG">
          10 FOLDS: TALLER THAN A MUG
        </Caption>
        <Caption name="14 folds" from={315} durationInFrames={45} highlight="YOUR HEIGHT">
          14: ABOUT YOUR HEIGHT
        </Caption>
        <Caption name="17 folds" from={375} durationInFrames={45} highlight="HOUSE">
          17: TALLER THAN A HOUSE
        </Caption>
        <Caption name="23 folds" from={441} durationInFrames={54} highlight="BURJ KHALIFA">
          23: TALLER THAN THE BURJ KHALIFA
        </Caption>
        <Caption name="27 folds" from={507} durationInFrames={48} highlight="PLANES EVEREST">
          27: ABOVE PLANES & EVEREST
        </Caption>
        <Caption name="30 folds" from={567} durationInFrames={48} highlight="SPACE">
          30: YOU'RE IN SPACE
        </Caption>
        <Caption name="Keep going" from={618} durationInFrames={54} highlight="">
          KEEP FOLDING…
        </Caption>
        <Caption name="At 42" from={672} durationInFrames={52} highlight="42…">
          AND AT 42…
        </Caption>
        <Caption name="Moon" from={732} durationInFrames={72} highlight="THE MOON">
          YOU PASSED THE MOON
        </Caption>
        <Caption name="Record" from={840} durationInFrames={36} highlight="ONLY 12.">
          WORLD RECORD? ONLY 12.
        </Caption>
      </Track>
      <Track name="Facts">
        <Caption name="Moon distance" from={750} durationInFrames={54} highlight="439,805" style={{ top: 1290, fontSize: 64 }}>
          439,805 km vs 384,400 km
        </Caption>
        <Caption name="Exponential" from={846} durationInFrames={30} highlight="EXPONENTIAL" style={{ top: 720, fontSize: 60 }}>
          THAT'S EXPONENTIAL GROWTH
        </Caption>
      </Track>
      <Track name="Voiceover">
        <Audio name="VO hook" from={0} src={staticFile("voiceover/01-hook.mp3")} />
        <Audio name="VO doubt" from={75} src={staticFile("voiceover/02-doubt.mp3")} />
        <Audio name="VO doubling" from={118} src={staticFile("voiceover/03-doubling.mp3")} />
        <Audio name="VO mug" from={252} src={staticFile("voiceover/04-mug.mp3")} />
        <Audio name="VO you" from={315} src={staticFile("voiceover/05-you.mp3")} />
        <Audio name="VO house" from={375} src={staticFile("voiceover/06-house.mp3")} />
        <Audio name="VO burj" from={441} src={staticFile("voiceover/07-burj.mp3")} />
        <Audio name="VO everest" from={507} src={staticFile("voiceover/08-everest.mp3")} />
        <Audio name="VO space" from={572} src={staticFile("voiceover/09-space.mp3")} />
        <Audio name="VO keep folding" from={618} src={staticFile("voiceover/10-keep.mp3")} />
        <Audio name="VO at 42" from={672} src={staticFile("voiceover/11-at42.mp3")} />
        <Audio name="VO moon" from={736} src={staticFile("voiceover/12-moon.mp3")} />
        <Audio name="VO record" from={840} src={staticFile("voiceover/13-record.mp3")} />
      </Track>
      <RewindFx />
      <Flash />
      <Music />
      {/* Sound effects */}
      <Audio name="Whoosh to teaser" from={35} src={staticFile("sfx/whoosh.wav")} volume={0.8} />
      <Audio name="Whoosh back" from={73} src={staticFile("sfx/whoosh.wav")} volume={0.6} />
      <Audio name="Fold 1" from={96} src={staticFile("sfx/page-turn.wav")} volume={0.9} />
      <Audio name="Fold 2" from={126} src={staticFile("sfx/page-turn.wav")} volume={0.9} />
      <Audio name="Fold 3" from={156} src={staticFile("sfx/page-turn.wav")} volume={0.9} />
      <Audio name="Whip mug" from={252} src={staticFile("sfx/whip.wav")} volume={0.45} />
      <Audio name="Whip you" from={315} src={staticFile("sfx/whip.wav")} volume={0.45} />
      <Audio name="Whip house" from={375} src={staticFile("sfx/whip.wav")} volume={0.45} />
      <Audio name="Whip burj" from={441} src={staticFile("sfx/whip.wav")} volume={0.45} />
      <Audio name="Whip everest" from={507} src={staticFile("sfx/whip.wav")} volume={0.45} />
      <Audio name="Whoosh space" from={565} src={staticFile("sfx/whoosh.wav")} volume={0.7} />
      <Audio name="Whoosh pull back" from={777} src={staticFile("sfx/whoosh.wav")} volume={0.7} />
      <Audio name="Scratch" from={802} src={staticFile("sfx/record-scratch.wav")} volume={0.7} />
      <Audio name="Rewind" from={806} src={staticFile("music/rewind.wav")} volume={0.5} />
      <Audio name="Record ding" from={840} src={staticFile("sfx/ding.wav")} volume={0.5} />
      <Audio name="Unfold" from={876} src={staticFile("sfx/page-turn.wav")} volume={0.8} />
      {LANDINGS.map((l) => (
        <Audio
          key={l.fold}
          name={`Fold ${l.fold} click`}
          from={l.frame}
          src={staticFile("sfx/mouse-click.wav")}
          volume={0.35}
        />
      ))}
    </AbsoluteFill>
  );
};
