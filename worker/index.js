// Telegram webhook + cron for the Shorts bot. Replies to quick commands here and
// hands real work (ideas, renders, uploads) to the GitHub Actions workflow.

const HELP = `🤖 Shorts Studio bot
• I send a new idea + script at 12:30 PM and 6:30 PM.
• Reply with a voice note reading the script (pause ~1 sec between lines) → I make the video with your voice.
• Reply ✅ to upload to YouTube, ❌ to discard, or send another voice note to redo.
• /new — make a new Short now
• /redo — replace the current idea with a different one
• /status — what I'm waiting for`;

const sendText = (env, chat, text) =>
  fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text }),
  });

const github = (env, path, init = {}) =>
  fetch(`https://api.github.com/repos/${env.REPO}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.GH_TOKEN}`, "User-Agent": "shorts-bot-worker", Accept: "application/vnd.github+json", ...init.headers },
  });

const dispatch = async (env, action, fileId = "") => {
  const res = await github(env, "/actions/workflows/shorts.yml/dispatches", {
    method: "POST",
    body: JSON.stringify({ ref: "main", inputs: { action, file_id: fileId } }),
  });
  if (!res.ok) throw new Error(`GitHub dispatch ${res.status}: ${(await res.text()).slice(0, 300)}`);
};

const activeJob = async (env) => {
  const res = await github(env, "/contents/automation/state.json", { headers: { Accept: "application/vnd.github.raw+json" } });
  if (!res.ok) throw new Error(`GitHub state ${res.status}`);
  const s = await res.json();
  return s.activeJob ? { id: s.activeJob, ...s.jobs[s.activeJob] } : null;
};

const handleMessage = async (env, msg) => {
  const chat = msg.chat.id;
  if (String(chat) !== env.OWNER_CHAT_ID) return; // ignore strangers
  const text = (msg.text ?? "").trim();
  const voice = msg.voice ?? msg.audio ?? (msg.document?.mime_type?.startsWith("audio/") ? msg.document : null);

  if (voice) {
    const job = await activeJob(env);
    if (!["awaiting_voice", "awaiting_approval"].includes(job?.status))
      return sendText(env, chat, "I don't have a Short waiting for a voice note. Send /new to make one.");
    await dispatch(env, "voice", voice.file_id);
    return sendText(env, chat, "🎧 Got your voice! Making the video with it… (takes ~5–10 minutes)");
  }
  if (/^(✅|👍|yes|upload|ok)$/i.test(text)) {
    const job = await activeJob(env);
    if (job?.status !== "awaiting_approval") return sendText(env, chat, "Nothing is waiting for approval right now.");
    return dispatch(env, "approve"); // the workflow says "Uploading…" itself
  }
  if (/^(❌|no|discard)$/i.test(text)) {
    await dispatch(env, "discard");
    return sendText(env, chat, "🗑️ Discarded. Send /new for a fresh idea.");
  }
  if (text === "/new" || text === "/redo") {
    await dispatch(env, text === "/redo" ? "redo" : "generate");
    return sendText(env, chat, "🧠 Thinking of a fresh viral idea… (takes ~1–3 minutes)");
  }
  if (text === "/status") {
    const job = await activeJob(env);
    return sendText(env, chat, job ? `Current: ${job.title}\nStatus: ${job.status}` : "No active Short. Send /new.");
  }
  return sendText(env, chat, HELP);
};

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST" || request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET)
      return new Response("not found", { status: 404 });
    const update = await request.json();
    if (update.message)
      ctx.waitUntil(
        handleMessage(env, update.message).catch((e) =>
          sendText(env, update.message.chat.id, `⚠️ ${e.message.slice(0, 500)}`),
        ),
      );
    return new Response("ok");
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      dispatch(env, "generate").catch((e) => sendText(env, env.OWNER_CHAT_ID, `⚠️ Couldn't start today's Short: ${e.message}`)),
    );
  },
};
