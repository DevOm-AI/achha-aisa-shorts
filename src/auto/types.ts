// Data contract between the automation scripts and the AutoShort composition.

export type SceneSpec =
  | { type: "hook"; emoji: string; big: string }
  | { type: "counter"; emoji: string; from: number; to: number; prefix?: string; suffix?: string; label: string }
  | {
      type: "compare";
      left: { emoji: string; label: string; value: number };
      right: { emoji: string; label: string; value: number };
      unit: string;
    }
  | { type: "grow"; items: { emoji: string; label: string }[] }
  | { type: "list"; items: { emoji: string; text: string }[] }
  | { type: "fact"; emoji: string; big: string; small: string }
  | { type: "reveal"; emoji: string; big: string }
  | {
      type: "race";
      left: { emoji: string; label: string; value: number };
      right: { emoji: string; label: string; value: number };
      unit: string;
    }
  | { type: "orbit"; center: { emoji: string; label: string }; orbiter: { emoji: string; label: string }; big: string }
  | { type: "stack"; emoji: string; count: number; label: string };

export type Line = {
  text: string; // spoken Hinglish line, shown as captions
  highlight: string; // words to color yellow
  scene: SceneSpec;
  durationInFrames: number;
  speech?: [number, number][]; // voiced segments in frames from line start, from the voice recording
  wordStarts?: number[]; // start frame of each caption word from line start, when known exactly (TTS)
};

export type AutoShortProps = {
  title: string;
  accent: string; // theme color, e.g. "#7c3aed"
  lines: Line[];
  voice: string | null; // path inside public/, e.g. "jobs/abc/voice.wav"
  voiceTrimBefore: number; // frames of leading silence to skip
};
