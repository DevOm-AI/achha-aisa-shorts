// Job actions shared by the local bot (bot.mjs) and the GitHub Actions runner (remote.mjs).
import path from "node:path";
import {
  downloadTelegramFile,
  findSentences,
  jobDir,
  jobOut,
  loadState,
  log,
  readJson,
  renderJob,
  sendText,
  sendVideo,
  timingsFromVoice,
  toWav,
  updateState,
  writeJson,
} from "./lib.mjs";
import { generate } from "./generate.mjs";
import { upload, youtubeReady } from "./youtube.mjs";

export const activeJob = () => {
  const s = loadState();
  return s.activeJob ? { id: s.activeJob, ...s.jobs[s.activeJob] } : null;
};

export const setStatus = (id, status, extra = {}) =>
  updateState((s) => {
    s.jobs[id] = { ...s.jobs[id], status, ...extra };
  });

export const handleVoice = async (chat, fileId) => {
  const job = activeJob();
  if (!job || !["awaiting_voice", "awaiting_approval"].includes(job.status)) {
    await sendText(chat, "I don't have a Short waiting for a voice note. Send /new to make one.");
    return;
  }
  const dir = jobDir(job.id);
  const raw = path.join(dir, "voice-raw");
  await downloadTelegramFile(fileId, raw);
  await toWav(raw, path.join(dir, "voice.wav"));
  await toWav(raw, path.join(dir, "voice-16k.wav"), 16000);

  const propsFile = path.join(dir, "props.json");
  const props = readJson(propsFile);
  const { sentences, duration, suspect } = findSentences(path.join(dir, "voice-16k.wav"), props.lines);
  const { trimBefore, durations, speech } = timingsFromVoice(sentences);
  props.voice = `jobs/${job.id}/voice.wav`;
  props.voiceTrimBefore = trimBefore;
  props.lines = props.lines.map((l, i) => ({ ...l, durationInFrames: durations[i], speech: speech[i] }));
  writeJson(propsFile, props);
  log("voice", job.id, `${duration.toFixed(1)}s`, durations, suspect.length ? `suspect lines ${suspect}` : "");

  const final = await renderJob(job.id, "final");
  setStatus(job.id, "awaiting_approval");
  const total = durations.reduce((a, b) => a + b, 0) / 30;
  await sendVideo(
    chat,
    final,
    `✅ Final video (${total.toFixed(1)}s).${suspect.length ? ` ⚠️ Line ${suspect.join(", ")} timing looks unusual: check the captions before approving (pause ~1 sec between lines and re-record if off).` : ""} Reply ✅ to upload to YouTube, ❌ to discard, or send a new voice note to redo.`,
  );
};

export const handleApprove = async (chat) => {
  const job = activeJob();
  if (!job || job.status !== "awaiting_approval") {
    await sendText(chat, "Nothing is waiting for approval right now.");
    return;
  }
  if (!youtubeReady()) {
    await sendText(chat, "YouTube isn't connected yet. Run `node automation/youtube.mjs auth` on the PC and update the YOUTUBE_REFRESH_TOKEN secret, then reply ✅ again.");
    return;
  }
  await sendText(chat, "⬆️ Uploading to YouTube…");
  const script = readJson(path.join(jobDir(job.id), "script.json"));
  const yt = script.youtube;
  const description = `${yt.description}\n\nEmoji graphics: Twemoji (CC-BY 4.0)`;
  const res = await upload(jobOut(job.id, "final"), { title: yt.title, description, tags: yt.tags ?? [] });
  setStatus(job.id, "uploaded", { youtube: res });
  updateState((s) => {
    s.activeJob = null;
  });
  await sendText(
    chat,
    res.privacy === "private"
      ? `📤 Uploaded as PRIVATE (YouTube restricts unverified API apps). Open it and set it to Public:\n${res.url}`
      : `🚀 Live! ${res.url}`,
  );
};

export const discard = () => {
  const job = activeJob();
  if (job) {
    setStatus(job.id, "discarded");
    updateState((s) => (s.activeJob = null));
  }
};

export const newShort = async (redo) => {
  const job = activeJob();
  if (redo && job) setStatus(job.id, "discarded");
  return generate();
};
