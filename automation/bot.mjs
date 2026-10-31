// Always-on Telegram bot: receives voice notes, syncs them into the video, uploads on approval.
// Commands: /start /new /redo /status /help, voice note = narration, ✅ = upload, ❌ = discard.
import { activeJob, discard, handleApprove, handleVoice, newShort } from "./actions.mjs";
import { loadState, log, saveState, sendText, telegram, updateState } from "./lib.mjs";

const HELP = `🤖 Shorts Studio bot
• I send a new idea + script at 12:30 PM and 6:30 PM.
• Reply with a voice note reading the script (pause ~1 sec between lines) → I make the video with your voice.
• Reply ✅ to upload to YouTube, ❌ to discard, or send another voice note to redo.
• /new — make a new Short now
• /redo — replace the current idea with a different one
• /status — what I'm waiting for`;

// Serialize heavy work (renders, uploads) so jobs never overlap.
let queue = Promise.resolve();
const enqueue = (chat, label, fn) => {
  queue = queue.then(fn).catch(async (e) => {
    log(label, "failed:", e);
    await sendText(chat, `⚠️ ${label} failed: ${e.message.slice(0, 600)}`).catch(() => {});
  });
};

const handleMessage = async (msg) => {
  const chat = msg.chat.id;
  const state = loadState();
  if (!state.ownerChatId && msg.text === "/start") {
    state.ownerChatId = chat;
    saveState(state);
    await sendText(chat, `👋 Connected! You're the owner of this bot.\n\n${HELP}`);
    return;
  }
  if (chat !== state.ownerChatId) return; // ignore strangers

  const text = (msg.text ?? "").trim();
  const voice = msg.voice ?? msg.audio ?? (msg.document?.mime_type?.startsWith("audio/") ? msg.document : null);

  if (voice)
    return enqueue(chat, "Voice sync", async () => {
      if (["awaiting_voice", "awaiting_approval"].includes(activeJob()?.status))
        await sendText(chat, "🎧 Got your voice! Making the video with it… (takes ~3–4 minutes)");
      await handleVoice(chat, voice.file_id);
    });
  if (/^(✅|👍|yes|upload|ok)$/i.test(text)) return enqueue(chat, "Upload", () => handleApprove(chat));
  if (/^(❌|no|discard)$/i.test(text)) {
    discard();
    return sendText(chat, "🗑️ Discarded. Send /new for a fresh idea.");
  }
  if (text === "/new" || text === "/redo") {
    await sendText(chat, "🧠 Thinking of a fresh viral idea… (takes ~1–3 minutes)");
    return enqueue(chat, "Generating", () => newShort(text === "/redo"));
  }
  if (text === "/status") {
    const job = activeJob();
    return sendText(chat, job ? `Current: ${job.title}\nStatus: ${job.status}` : "No active Short. Send /new.");
  }
  return sendText(chat, HELP);
};

const loop = async () => {
  log("bot started");
  await telegram("setMyCommands", {
    commands: [
      { command: "new", description: "Make a new Short now" },
      { command: "redo", description: "Different idea for the current Short" },
      { command: "status", description: "What are we waiting for" },
      { command: "help", description: "How this works" },
    ],
  }).catch((e) => log("setMyCommands", e.message));
  for (;;) {
    try {
      const state = loadState();
      const updates = await telegram("getUpdates", { offset: state.offset, timeout: 50, allowed_updates: ["message"] });
      for (const u of updates) {
        updateState((s) => (s.offset = u.update_id + 1));
        if (u.message) await handleMessage(u.message).catch((e) => log("handler error", e));
      }
    } catch (e) {
      log("poll error", e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
};

loop();
