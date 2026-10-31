// GitHub Actions entry point: runs one bot action, triggered by the Cloudflare Worker (worker/).
// Run: node automation/remote.mjs <generate|redo|voice|approve|discard> [telegramFileId]
import { existsSync } from "node:fs";
import path from "node:path";
import { activeJob, discard, handleApprove, handleVoice, newShort } from "./actions.mjs";
import { ROOT, jobOut, loadState, log, run, sendText, updateState } from "./lib.mjs";

const [action, fileId] = process.argv.slice(2);
const chat = Number(process.env.OWNER_CHAT_ID) || loadState().ownerChatId;

// The final render lives in the Actions artifact of the run that made it; fetch it for the upload.
const fetchFinal = async () => {
  const job = activeJob();
  if (!job || job.status !== "awaiting_approval" || existsSync(jobOut(job.id, "final"))) return;
  if (!job.finalRun) throw new Error("final video not found: send the voice note again");
  await run("gh", ["run", "download", String(job.finalRun), "-n", "final", "-D", path.join(ROOT, "out", "jobs")]);
};

const actions = {
  generate: () => newShort(false),
  redo: () => newShort(true),
  voice: async () => {
    await handleVoice(chat, fileId);
    const job = activeJob();
    if (job?.status === "awaiting_approval")
      updateState((s) => (s.jobs[job.id].finalRun = process.env.GITHUB_RUN_ID));
  },
  approve: async () => {
    await fetchFinal();
    await handleApprove(chat);
  },
  discard: async () => discard(),
};

if (!actions[action]) {
  log("unknown action", action);
  process.exit(1);
}
actions[action]()
  .then(() => log("done", action))
  .catch(async (e) => {
    log(action, "failed:", e);
    await sendText(chat, `⚠️ ${action} failed: ${e.message.slice(0, 600)}`).catch(() => {});
    process.exit(1);
  });
