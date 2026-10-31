// Generates the PaperToMoon voiceover with ElevenLabs into public/voiceover/.
// Run: node --env-file=.env scripts/generate-voiceover.mjs [lineId ...]
import { mkdirSync, writeFileSync } from "node:fs";

const VOICE_ID = "TX3LPaxmHKxFdv7VOQHJ"; // Liam - energetic social media creator
const OUT = new URL("../public/voiceover/", import.meta.url);

export const LINES = [
  { id: "01-hook", text: "Fold this paper forty-two times... and it reaches the Moon." },
  { id: "02-doubt", text: "Sounds fake? Watch." },
  { id: "03-doubling", text: "Every fold doubles the thickness." },
  { id: "04-mug", text: "Ten folds: taller than a mug." },
  { id: "05-you", text: "Fourteen: about your height." },
  { id: "06-house", text: "Seventeen: taller than a house." },
  { id: "07-burj", text: "Twenty-three: beats the Burj Khalifa." },
  { id: "08-everest", text: "Twenty-seven: above planes and Everest." },
  { id: "09-space", text: "Thirty: space!" },
  { id: "10-keep", text: "Keep folding..." },
  { id: "11-at42", text: "And at forty-two..." },
  { id: "12-moon", text: "you just passed the Moon!" },
  { id: "13-record", text: "The world record? Only twelve." },
];

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
mkdirSync(OUT, { recursive: true });

const only = process.argv.slice(2);
for (const line of LINES) {
  if (only.length && !only.includes(line.id)) continue;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: line.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true, speed: 1.2 },
    }),
  });
  if (!res.ok) throw new Error(`${line.id}: ${res.status} ${await res.text()}`);
  writeFileSync(new URL(`${line.id}.mp3`, OUT), Buffer.from(await res.arrayBuffer()));
  console.log("wrote", line.id);
}
