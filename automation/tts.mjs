// ElevenLabs narration for a job, with exact per-word caption timing from the TTS alignment.
// public/jobs/<id>/spoken.json holds, per line, one spoken token per caption word (e.g. "0.1" → "ज़ीरो पॉइंट वन").
// Run: node automation/tts.mjs <jobId>
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FPS, jobDir, log, readJson, run, writeJson } from "./lib.mjs";

const VOICE_ID = "TX3LPaxmHKxFdv7VOQHJ"; // Liam - energetic social media creator (premade; free tier can't use library voices)
const RATE = 44100;
const GAP = 0.3; // seconds of silence after each line
const TAIL = 0.9; // extra hold after the last line

const tts = async (text, previous_text, next_text) => {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      previous_text,
      next_text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true, speed: 1.1 },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const j = await res.json();
  // Decode the MP3 to raw 16-bit mono PCM (PCM output needs the Pro tier).
  const mp3 = path.join(tmpdir(), `tts-${process.pid}.mp3`);
  const wav = path.join(tmpdir(), `tts-${process.pid}.wav`);
  writeFileSync(mp3, Buffer.from(j.audio_base64, "base64"));
  await run("npx", ["remotion", "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", String(RATE), "-c:a", "pcm_s16le", wav]);
  const buf = readFileSync(wav);
  let off = 12;
  while (buf.toString("ascii", off, off + 4) !== "data") off += 8 + buf.readUInt32LE(off + 4);
  return { pcm: buf.subarray(off + 8, off + 8 + buf.readUInt32LE(off + 4)), align: j.alignment };
};

const wavHeader = (bytes) => {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + bytes, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(bytes, 40);
  return h;
};

export const narrate = async (id) => {
  const dir = jobDir(id);
  const propsFile = path.join(dir, "props.json");
  const props = readJson(propsFile);
  const spoken = readJson(path.join(dir, "spoken.json"));
  const texts = spoken.map((t) => t.join(" "));
  const chunks = [];
  const lines = [];
  for (let i = 0; i < props.lines.length; i++) {
    const words = props.lines[i].text.split(/\s+/).filter(Boolean);
    if (spoken[i].length !== words.length) throw new Error(`line ${i + 1}: ${spoken[i].length} spoken tokens for ${words.length} words`);
    const { pcm, align } = await tts(texts[i], texts.slice(0, i).join(" ") || undefined, texts.slice(i + 1).join(" ") || undefined);
    const audioSec = pcm.length / 2 / RATE;
    // Each caption word starts at its token's first character in the alignment.
    let offset = 0;
    const wordSec = spoken[i].map((tok) => {
      const t = align.character_start_times_seconds[offset];
      offset += tok.length + 1;
      return t;
    });
    const speechEnd = align.character_end_times_seconds.at(-1);
    const last = i === props.lines.length - 1;
    const durationInFrames = Math.ceil((audioSec + (last ? TAIL : GAP)) * FPS);
    // Pad every line to its exact frame length so line starts stay frame-aligned in the joined track.
    const padded = Buffer.alloc(Math.round((durationInFrames / FPS) * RATE) * 2);
    pcm.copy(padded, 0, 0, Math.min(pcm.length, padded.length));
    chunks.push(padded);
    lines.push({
      ...props.lines[i],
      durationInFrames,
      wordStarts: wordSec.map((t) => Math.round(t * FPS)),
      speech: [[Math.round(wordSec[0] * FPS), Math.round(speechEnd * FPS)]],
    });
    log(`line ${i + 1}: ${audioSec.toFixed(2)}s`, wordSec.map((t) => t.toFixed(2)).join(" "));
  }
  const data = Buffer.concat(chunks);
  writeFileSync(path.join(dir, "voice.wav"), Buffer.concat([wavHeader(data.length), data]));
  writeJson(propsFile, { ...props, voice: `jobs/${id}/voice.wav`, voiceTrimBefore: 0, lines });
  return lines;
};

if (process.argv[1]?.endsWith("tts.mjs")) {
  narrate(process.argv[2]).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
