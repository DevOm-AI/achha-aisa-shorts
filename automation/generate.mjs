// Creates a new Short: idea + Hinglish script (Gemini, sourced from Wikipedia), draft render, Telegram delivery.
// Run: node automation/generate.mjs [--no-send]
import path from "node:path";
import {
  AUTO,
  estimateDurations,
  jobDir,
  loadState,
  log,
  readJson,
  sendText,
  updateState,
  writeJson,
} from "./lib.mjs";
import { askGemini, wikiArticle } from "./gemini.mjs";

const HISTORY = path.join(AUTO, "history.json");
const SCENE_TYPES = ["hook", "counter", "compare", "race", "orbit", "stack", "grow", "list", "fact", "reveal"];
const ACCENTS = ["#7c3aed", "#db2777", "#2563eb", "#059669", "#ea580c", "#0891b2", "#9333ea", "#dc2626"];

const WRITER = "You are the head writer of a fast-growing Indian YouTube Shorts channel that explains mind-blowing facts in Hinglish.";

const topicRules = (history) => `- Topic: a genuinely surprising, verifiable fact with a strong "no way!" reaction about ONE thing viewers can picture instantly, plus one surprising physical fact about it (e.g. "Saturn paani mein tair sakta hai", "Shark pedon se bhi purani hai", "Eiffel Tower ko har 7 saal mein 60 ton paint"). Strongly prefer: animals; famous landmarks and everyday or famous objects; planets and space objects with one clear visual. The title must name that subject.
- Avoid: history timelines and "who lived closer to what" comparisons; pure number or unit math (seconds vs years, lakh vs crore, folding/doubling); comparisons between two abstract things (e.g. phone vs Apollo computer); abstract space ideas that are hard to picture. Also avoid anything political, religious, medical advice, or tragic.
- Do NOT repeat or closely resemble these previous Shorts: ${history.length ? history.map((h) => `"${h}"`).join(", ") : "(none yet)"}.
`;

const ideaPrompt = (history) => `${WRITER}

Suggest 3 different ideas for ONE new Short. Rules:
${topicRules(history)}
- Each fact must be something the subject's English Wikipedia article states with numbers.

Respond with ONLY a JSON array of 3 objects: [{"subject":"...","wikipedia":"exact English Wikipedia article title","fact":"the surprising fact in one English sentence"}]`;

const prompt = (history, source) => `${WRITER}

Create ONE new Short about "${source.title}". Suggested fact: ${source.fact}
Requirements:
${topicRules(history)}
- Every number and claim must come from the SOURCE TEXT below. If the suggested fact is not in it, pick a different surprising fact from it about the same subject. For every number you use, add a "facts" entry whose "quote" is copied word for word from the source text (one sentence or less).
- Script: exactly 6 lines in natural spoken Hinglish written in Roman script (like "Kya aap jaante ho..."). Each line max 14 words. Total speaking time about 25-30 seconds.
  - Line 1 is the hook: a bold, curiosity-gap claim in the first 2 seconds. No greetings, no "aaj hum".
  - Lines 2-5 build up with concrete numbers and comparisons Indians relate to (cricket ground, Burj Khalifa, Mumbai local, rupees, Mount Everest, etc.).
  - Line 6: payoff + a question that makes people comment.
- For each line choose the MOST VISUAL, most animated scene that fits it. Viewers must see things move, not read text. Use at least 5 different scene types across the 6 lines; line 1 must be "hook", and line 5 or 6 must be "reveal". Use "fact" at most once, and only when nothing more visual fits.
  {"type":"hook","emoji":"🌍","big":"SHORT PUNCHY TEXT (max 18 chars)"}  (emoji crashes in from the sky)
  {"type":"race","left":{"emoji":"🚶","label":"max 14 chars","value":6},"right":{"emoji":"🚀","label":"max 14 chars","value":28000},"unit":"km/h"}  (two things race on a track at their real relative speeds; use for ANY speed/rate/time comparison)
  {"type":"orbit","center":{"emoji":"☀️","label":"max 12 chars"},"orbiter":{"emoji":"🌍","label":"max 12 chars"},"big":"max 16 chars"}  (one thing circles another; use for planets, moons, cycles, rotation, anything going round)
  {"type":"stack","emoji":"🚌","count":12,"label":"max 26 chars"}  (that many items rain down and pile up; use for "X of these would fit / it equals N of these"; count is a plain integer)
  {"type":"compare","left":{"emoji":"🐜","label":"max 14 chars","value":1},"right":{"emoji":"🐘","label":"max 14 chars","value":5000},"unit":"kg"}  (bars grow, winner gets a crown and an "N× ZYADA" stamp; for size/weight/money/count)
  {"type":"counter","emoji":"💰","from":0,"to":1000000,"prefix":"₹","suffix":"","label":"max 22 chars"}  (number spins up with a progress ring, then explodes)
  {"type":"grow","items":[{"emoji":"🐭","label":"max 10 chars"},{"emoji":"🐶","label":"..."},{"emoji":"🐘","label":"..."}]}  (camera pans along 2-4 items, small to big)
  {"type":"list","items":[{"emoji":"🍎","text":"max 18 chars"}]}  (2-3 cards slam in)
  {"type":"fact","emoji":"🧠","big":"max 14 chars","small":"max 28 chars"}
  {"type":"reveal","emoji":"🤯","big":"max 16 chars"}  (tension, then a big explosion)
  Emojis: a single common standard emoji (no skin tones, no flags, no combined sequences). Numbers in race/compare/counter/stack must be plain numbers.
- "highlight": 1-3 key words from that line to color yellow.
- YouTube metadata: a curiosity title in Hinglish (max 70 chars, 1 emoji, end with #shorts), a 2-3 line Hinglish description with 5 relevant hashtags, and 8 tags.

Respond with ONLY a JSON object, no markdown fences, in exactly this shape:
{"title":"...","idea":"one-line English summary","lines":[{"text":"...","highlight":"...","scene":{...}}],"youtube":{"title":"...","description":"...","tags":["..."]},"facts":[{"claim":"...","quote":"exact words from the source text"}]}

SOURCE TEXT (Wikipedia: ${source.title}):
${source.text}`;

const extractJson = (text) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON in model output");
  return JSON.parse(text.slice(start, end + 1));
};

const twemojiOk = async (emoji) => {
  const code = Array.from(emoji)
    .map((c) => c.codePointAt(0).toString(16))
    .filter((cp) => cp !== "fe0f")
    .join("-");
  const res = await fetch(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${code}.svg`, { method: "HEAD" });
  return res.ok;
};

// Replace any emoji Twemoji doesn't have, so renders never fail.
const fixEmojis = async (node) => {
  if (Array.isArray(node)) {
    for (const n of node) await fixEmojis(n);
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "emoji" && typeof v === "string") {
        if (!(await twemojiOk(v))) node[k] = "✨";
      } else await fixEmojis(v);
    }
  }
};

// Gemini suggests ideas; the first whose Wikipedia article exists becomes the script's only source.
const pickSource = async (titles) => {
  const ideas = extractJson(`{"ideas":${await askGemini(ideaPrompt(titles))}}`).ideas;
  for (const idea of ideas) {
    const article = await wikiArticle(idea.wikipedia ?? idea.subject).catch(() => null);
    if (article) return { ...article, fact: idea.fact };
  }
  throw new Error("no Wikipedia article for any idea");
};

// Every fact must quote the source word for word, so made-up numbers get rejected.
const norm = (t) => t.toLowerCase().replace(/[\s\u00a0]+/g, " ").replace(/[‘’“”"]/g, "'").trim();
const checkQuotes = (s, source) => {
  if (!Array.isArray(s.facts) || !s.facts.length) throw new Error("no facts quoted");
  const text = norm(source.text);
  const bad = s.facts.filter((f) => !f.quote || !text.includes(norm(f.quote).replace(/[.]$/, "")));
  if (bad.length) throw new Error(`quotes not in source: ${bad.map((f) => f.quote).join(" | ").slice(0, 300)}`);
  s.facts = s.facts.map((f) => ({ claim: f.claim, source: source.url }));
};

const validate = (s) => {
  if (!Array.isArray(s.lines) || s.lines.length < 5 || s.lines.length > 6) throw new Error("need 5-6 lines");
  const num = (v) => typeof v === "number" && Number.isFinite(v);
  const item = (v) => v && typeof v.emoji === "string" && typeof v.label === "string";
  const ok = {
    hook: (c) => c.emoji && c.big,
    counter: (c) => c.emoji && num(c.from) && num(c.to) && c.label,
    compare: (c) => item(c.left) && item(c.right) && num(c.left.value) && num(c.right.value),
    race: (c) => item(c.left) && item(c.right) && num(c.left.value) && num(c.right.value) && c.left.value > 0 && c.right.value > 0,
    orbit: (c) => item(c.center) && item(c.orbiter) && c.big,
    stack: (c) => c.emoji && num(c.count) && c.count >= 1 && c.label,
    grow: (c) => Array.isArray(c.items) && c.items.length >= 2 && c.items.every(item),
    list: (c) => Array.isArray(c.items) && c.items.length >= 1 && c.items.every((i) => i.emoji && i.text),
    fact: (c) => c.emoji && c.big && typeof c.small === "string",
    reveal: (c) => c.emoji && c.big,
  };
  for (const l of s.lines) {
    if (!l.text || !l.scene || !SCENE_TYPES.includes(l.scene.type) || !ok[l.scene.type](l.scene))
      throw new Error(`bad line: ${JSON.stringify(l)}`);
    l.highlight = l.highlight ?? "";
    if (l.scene.unit === undefined && ["compare", "race"].includes(l.scene.type)) l.scene.unit = "";
  }
  if (!s.youtube?.title) throw new Error("missing youtube metadata");
};

export const generate = async ({ send = true } = {}) => {
  const history = readJson(HISTORY, []);
  const titles = history.map((h) => h.title);
  let script;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      log(`asking Gemini for an idea (attempt ${attempt})`);
      const source = await pickSource(titles);
      log("source:", source.title, "|", source.fact);
      script = extractJson(await askGemini(prompt(titles, source)));
      validate(script);
      checkQuotes(script, source);
      break;
    } catch (e) {
      log("generation failed:", e.message);
      if (attempt === 3) throw e;
    }
  }
  await fixEmojis(script.lines);

  const id = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  const durations = estimateDurations(script.lines);
  const props = {
    title: script.title,
    accent: ACCENTS[Math.floor(Math.random() * ACCENTS.length)],
    voice: null,
    voiceTrimBefore: 0,
    lines: script.lines.map((l, i) => ({ ...l, durationInFrames: durations[i] })),
  };
  writeJson(path.join(jobDir(id), "props.json"), props);
  writeJson(path.join(jobDir(id), "script.json"), script);
  writeJson(HISTORY, [...history, { title: script.title, idea: script.idea, id, date: new Date().toISOString() }]);

  const state = updateState((s) => {
    s.jobs[id] = { status: "awaiting_voice", title: script.title, createdAt: Date.now() };
    s.activeJob = id;
  });

  if (send && state.ownerChatId) {
    const chat = state.ownerChatId;
    const lines = script.lines.map((l, i) => `${i + 1}. ${l.text}`).join("\n");
    const facts = (script.facts ?? []).map((f) => `• ${f.claim}\n  ${f.source}`).join("\n");
    await sendText(
      chat,
      `🎬 NEW SHORT (${id})\n\n💡 ${script.idea}\n\n🎙️ SCRIPT — read these ${script.lines.length} lines, pause ~1 second between each line:\n\n${lines}\n\n📌 YouTube title: ${script.youtube.title}\n\n🔎 Fact sources (please double-check):\n${facts || "—"}`,
    );
    await sendText(chat, "🎤 Send me a voice note reading the script, and I'll make the video with your voice. Or send /redo for a different idea.");
  } else if (send) {
    log("No Telegram owner registered yet: send /start to the bot first.");
  }
  return id;
};

if (process.argv[1] && process.argv[1].endsWith("generate.mjs")) {
  generate({ send: !process.argv.includes("--no-send") })
    .then((id) => log("done", id))
    .catch(async (e) => {
      log("FAILED", e);
      const chat = loadState().ownerChatId;
      if (chat) await sendText(chat, `⚠️ Couldn't generate today's Short: ${e.message.slice(0, 500)}`).catch(() => {});
      process.exit(1);
    });
}
