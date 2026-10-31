// Shared helpers for the Shorts automation: config, Telegram, job state, audio alignment, rendering.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const AUTO = path.join(ROOT, "automation");
export const FPS = 30;

// ---------- env ----------
const envFile = path.join(ROOT, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

export const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------- JSON state ----------
export const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback);
export const writeJson = (file, data) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
};

const STATE = path.join(AUTO, "state.json");
export const loadState = () => readJson(STATE, { ownerChatId: null, offset: 0, jobs: {} });
export const saveState = (s) => writeJson(STATE, s);
export const updateState = (fn) => {
  const s = loadState();
  fn(s);
  saveState(s);
  return s;
};

export const jobDir = (id) => path.join(ROOT, "public", "jobs", id); // served to Remotion via staticFile
export const jobOut = (id, kind) => path.join(ROOT, "out", "jobs", `${id}-${kind}.mp4`);

// ---------- processes ----------
export const run = (cmd, args, { cwd = ROOT, timeoutMs = 20 * 60_000, input } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: process.env });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    if (input !== undefined) child.stdin.end(input);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} ${args.slice(0, 3).join(" ")} exited ${code}: ${(err || out).slice(-1500)}`));
    });
  });

// ---------- Telegram ----------
const tg = (method) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

export const telegram = async (method, body) => {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN missing in .env");
  const res = await fetch(tg(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const j = await res.json();
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description}`);
  return j.result;
};

export const sendText = async (chatId, text) => {
  // Telegram caps messages at 4096 chars.
  for (let i = 0; i < text.length; i += 4000) {
    await telegram("sendMessage", { chat_id: chatId, text: text.slice(i, i + 4000) });
  }
};

export const sendVideo = async (chatId, file, caption) => {
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("caption", caption.slice(0, 1000));
  form.set("supports_streaming", "true");
  form.set("video", new Blob([readFileSync(file)], { type: "video/mp4" }), path.basename(file));
  const res = await fetch(tg("sendVideo"), { method: "POST", body: form });
  const j = await res.json();
  if (!j.ok) throw new Error(`Telegram sendVideo: ${j.description}`);
};

export const downloadTelegramFile = async (fileId, dest) => {
  const f = await telegram("getFile", { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${f.file_path}`);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
};

// ---------- audio ----------
export const toWav = (input, output, rate = 44100) =>
  run("npx", ["remotion", "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", input, "-ac", "1", "-ar", String(rate), "-c:a", "pcm_s16le", output]);

const readPcm = (wavFile) => {
  const buf = readFileSync(wavFile);
  const rate = buf.readUInt32LE(24);
  let off = 12;
  while (off < buf.length - 8) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "data") return { rate, data: buf.subarray(off + 8, off + 8 + size) };
    off += 8 + size;
  }
  throw new Error("no data chunk");
};

// Voiced regions of a recording (seconds), from frame energy. Gaps shorter than 150 ms are merged.
const voiceRegions = (wavFile) => {
  const { rate, data } = readPcm(wavFile);
  const n = data.length / 2;
  const win = Math.round(rate * 0.02);
  const energies = [];
  for (let s = 0; s + win <= n; s += win) {
    let sum = 0;
    for (let i = s; i < s + win; i++) {
      const v = data.readInt16LE(i * 2) / 32768;
      sum += v * v;
    }
    energies.push(10 * Math.log10(sum / win + 1e-12));
  }
  const sorted = [...energies].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const peak = sorted[Math.floor(sorted.length * 0.98)];
  const threshold = Math.max(floor + 10, peak - 35);
  const regions = [];
  energies.forEach((e, i) => {
    if (e <= threshold) return;
    const last = regions[regions.length - 1];
    if (last && i - last.end <= 8) last.end = i;
    else regions.push({ start: i, end: i });
  });
  const real = regions
    .filter((r) => r.end - r.start >= 3)
    .map((r) => ({ start: (r.start * win) / rate, end: ((r.end + 1) * win) / rate }));
  if (real.length === 0) throw new Error("No speech detected in the recording");
  return { regions: real, duration: n / rate };
};

const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;

// Splits a voice recording into one sentence per line at pauses, choosing the pauses that are long
// AND give each line a share of the time matching its word count, so a breath in the middle of a
// line doesn't become a line break. `suspect` lists lines whose length is far from expected.
export const findSentences = (wavFile, lines) => {
  const count = lines.length;
  const { regions: real, duration } = voiceRegions(wavFile);
  const total = real[real.length - 1].end - real[0].start;
  const words = lines.map((l) => wordCount(l.text));
  const expected = words.map((w) => w / words.reduce((a, b) => a + b, 0));
  // best[k][j]: cost of splitting regions 0..j into k+1 lines, line k ending at region j.
  const m = real.length;
  const segCost = (k, a, b) => {
    const rel = ((real[b].end - real[a].start) / total - expected[k]) / expected[k];
    return 2 * rel * rel;
  };
  const gapBonus = (j) => real[j + 1].start - real[j].end;
  let sentences;
  if (m >= count) {
    const best = Array.from({ length: count }, () => new Array(m).fill(Infinity));
    const from = Array.from({ length: count }, () => new Array(m).fill(-1));
    for (let j = 0; j < m; j++) best[0][j] = segCost(0, 0, j);
    for (let k = 1; k < count; k++)
      for (let j = k; j < m; j++)
        for (let i = k - 1; i < j; i++) {
          const c = best[k - 1][i] - gapBonus(i) + segCost(k, i + 1, j);
          if (c < best[k][j]) {
            best[k][j] = c;
            from[k][j] = i;
          }
        }
    const ends = [m - 1];
    for (let k = count - 1; k > 0; k--) ends.unshift(from[k][ends[0]]);
    sentences = ends.map((e, k) => {
      const parts = real.slice(k === 0 ? 0 : ends[k - 1] + 1, e + 1);
      return { start: parts[0].start, end: parts[parts.length - 1].end, parts };
    });
  } else {
    // Fewer pauses than lines: split the speech proportionally to word counts.
    let t = real[0].start;
    sentences = expected.map((f) => {
      const s = { start: t, end: t + f * total };
      t = s.end;
      return { ...s, parts: [{ ...s }] };
    });
  }
  const suspect = sentences
    .map((st, k) => Math.abs((st.end - st.start) / total - expected[k]) / expected[k])
    .flatMap((rel, k) => (rel > 0.6 ? [k + 1] : []));
  return { sentences, duration, suspect };
};

// Turns sentence timings into per-line durations (frames), a leading trim, and
// each line's speech segments (frames from line start) so captions follow the voice.
export const timingsFromVoice = (sentences) => {
  const lead = Math.max(0, sentences[0].start - 0.15);
  const starts = sentences.map((s, i) => (i === 0 ? 0 : s.start - lead));
  const durations = starts.map((st, i) => {
    const next = i < starts.length - 1 ? starts[i + 1] : sentences[i].end - lead + 0.9;
    return Math.max(15, Math.round((next - st) * FPS));
  });
  const speech = sentences.map((s, i) =>
    s.parts.map((p) => [Math.round((p.start - lead - starts[i]) * FPS), Math.round((p.end - lead - starts[i]) * FPS)]),
  );
  return { trimBefore: Math.round(lead * FPS), durations, speech };
};

export const estimateDurations = (lines) =>
  lines.map((l) => Math.round((0.6 + l.text.split(/\s+/).length * 0.36) * FPS));

// ---------- rendering ----------
export const renderJob = async (id, kind) => {
  const props = path.join(jobDir(id), "props.json");
  const out = jobOut(id, kind);
  await run("npx", ["remotion", "render", "AutoShort", out, `--props=${props}`, "--crf=20", "--log=error"], {
    timeoutMs: 30 * 60_000,
  });
  return out;
};
