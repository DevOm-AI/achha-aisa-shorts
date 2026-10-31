// Free-tier LLM + fact sources: Gemini (AI Studio key) for writing, Wikipedia's public API for verification.
import { log } from "./lib.mjs";

// Tried in order; free-tier models are often briefly overloaded (503) or rate limited (429).
const MODELS = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const askGemini = async (prompt, { json = true, models = MODELS } = {}) => {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing in .env");
  let lastErr;
  for (let round = 0; round < 3; round++) {
    for (const model of models) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: json ? { responseMimeType: "application/json" } : {},
        }),
        signal: AbortSignal.timeout(3 * 60_000),
      }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
      if (res.ok) {
        const data = await res.json();
        const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
        if (text) return text;
        lastErr = new Error(`${model}: empty response (${data.candidates?.[0]?.finishReason ?? "no candidate"})`);
      } else {
        lastErr = new Error(`${model}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
        if (![0, 429, 500, 503].includes(res.status)) throw lastErr;
      }
      log("gemini:", lastErr.message.split("\n")[0]);
    }
    await sleep(20_000 * (round + 1));
  }
  throw lastErr;
};

const WIKI = "https://en.wikipedia.org/w/api.php";
const UA = { "User-Agent": "AchhaAisaShorts/1.0 (personal YouTube Shorts bot)" };

const wikiGet = async (params) => {
  const res = await fetch(`${WIKI}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`, { headers: UA });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  return res.json();
};

// Plain-text article for a title (falls back to the best search hit), trimmed to keep prompts small.
export const wikiArticle = async (query, maxChars = 40_000) => {
  const search = await wikiGet({ action: "query", list: "search", srsearch: query, srlimit: "1" });
  const title = search.query?.search?.[0]?.title;
  if (!title) return null;
  const page = await wikiGet({ action: "query", prop: "extracts", explaintext: "1", redirects: "1", titles: title });
  const text = page.query?.pages?.[0]?.extract;
  if (!text) return null;
  return { title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`, text: text.slice(0, maxChars) };
};
