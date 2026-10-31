import { Composition, Folder } from "remotion";
import { Main } from "./Main";
import { PaperToMoon } from "./paper/PaperToMoon";
import { AutoShort, calculateAutoShortMetadata } from "./auto/AutoShort";
import { Features } from "./scenes/Features";
import { FrameScene } from "./scenes/FrameScene";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import "./fonts";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Shorts">
        <Composition
          id="PaperToMoon"
          component={PaperToMoon}
          durationInFrames={900}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="AutoShort"
          component={AutoShort}
          durationInFrames={900}
          fps={30}
          width={1080}
          height={1920}
          calculateMetadata={calculateAutoShortMetadata}
          defaultProps={{
            title: "Paper fold karke Moon tak?",
            accent: "#7c3aed",
            voice: null,
            voiceTrimBefore: 0,
            lines: [
              {
                text: "Ek paper ko 42 baar fold karo, aur woh Moon tak pahunch jaayega!",
                highlight: "42 Moon",
                durationInFrames: 120,
                scene: { type: "hook", emoji: "📄", big: "42 FOLDS = 🌕?" },
              },
              {
                text: "Har fold pe thickness double ho jaati hai.",
                highlight: "double",
                durationInFrames: 90,
                scene: { type: "grow", items: [{ emoji: "📄", label: "0.1 mm" }, { emoji: "📚", label: "10 cm" }, { emoji: "🏠", label: "13 m" }] },
              },
              {
                text: "23 folds pe yeh Burj Khalifa se bhi lamba ho jaata hai.",
                highlight: "Burj Khalifa",
                durationInFrames: 100,
                scene: { type: "compare", left: { emoji: "📄", label: "23 folds", value: 839 }, right: { emoji: "🏙️", label: "Burj Khalifa", value: 828 }, unit: "m" },
              },
              {
                text: "30 folds pe aap seedha space mein ho!",
                highlight: "space",
                durationInFrames: 90,
                scene: { type: "counter", emoji: "🚀", from: 0, to: 107, suffix: " km", label: "30 folds" },
              },
              {
                text: "Aur 42 folds pe, Moon cross!",
                highlight: "Moon",
                durationInFrames: 90,
                scene: { type: "reveal", emoji: "🌕", big: "4,39,805 KM!" },
              },
              {
                text: "Lekin world record sirf 12 folds ka hai. Aap kitne kar paoge?",
                highlight: "12",
                durationInFrames: 120,
                scene: { type: "fact", emoji: "🏆", big: "RECORD: 12", small: "Comment karo 👇" },
              },
            ],
          }}
        />
      </Folder>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition
          id="Intro"
          component={Intro}
          durationInFrames={120}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            style: {
              backgroundColor: "#0B0D17",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            },
          }}
        />
        <Composition
          id="Features"
          component={Features}
          durationInFrames={135}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ style: { backgroundColor: "#0B0D17" } }}
        />
        <Composition
          id="FrameScene"
          component={FrameScene}
          durationInFrames={135}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ style: { backgroundColor: "#0B0D17" } }}
        />
        <Composition
          id="Outro"
          component={Outro}
          durationInFrames={105}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            style: {
              backgroundColor: "#0B0D17",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            },
          }}
        />
      </Folder>
    </>
  );
};
