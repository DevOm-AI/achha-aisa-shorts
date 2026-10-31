// YouTube Data API v3: one-time OAuth sign-in and resumable uploads.
// Sign in once: node automation/youtube.mjs auth
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { AUTO, ROOT, log, readJson, writeJson } from "./lib.mjs";

const CLIENT_FILE = path.join(ROOT, "youtube-client.json");
const TOKEN_FILE = path.join(AUTO, "youtube-token.json");
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const PORT = 8765;
const REDIRECT = `http://127.0.0.1:${PORT}`;

const client = () => {
  const j = readJson(CLIENT_FILE, null);
  if (!j) throw new Error(`Missing ${CLIENT_FILE} (download the OAuth Desktop client JSON from Google Cloud)`);
  return j.installed ?? j.web;
};

const auth = async () => {
  const { client_id, client_secret } = client();
  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({ client_id, redirect_uri: REDIRECT, response_type: "code", scope: SCOPE, access_type: "offline", prompt: "consent" });
  console.log(`\nOpen this URL in your browser and allow access:\n\n${url}\n`);
  const code = await new Promise((resolve) => {
    const server = createServer((req, res) => {
      const c = new URL(req.url, REDIRECT).searchParams.get("code");
      res.end(c ? "Signed in! You can close this tab." : "No code received.");
      if (c) {
        server.close();
        resolve(c);
      }
    }).listen(PORT, "127.0.0.1");
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ code, client_id, client_secret, redirect_uri: REDIRECT, grant_type: "authorization_code" }),
  });
  const tok = await res.json();
  if (!tok.refresh_token) throw new Error(`No refresh token: ${JSON.stringify(tok)}`);
  writeJson(TOKEN_FILE, { refresh_token: tok.refresh_token });
  console.log("Saved YouTube token. Uploads are ready.");
};

const accessToken = async () => {
  const { client_id, client_secret } = client();
  const { refresh_token } = readJson(TOKEN_FILE, {});
  if (!refresh_token) throw new Error("YouTube not signed in: run `node automation/youtube.mjs auth`");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(j)}`);
  return j.access_token;
};

export const youtubeReady = () => {
  try {
    client();
    return Boolean(readJson(TOKEN_FILE, {}).refresh_token);
  } catch {
    return false;
  }
};

export const upload = async (file, { title, description, tags }) => {
  const token = await accessToken();
  const size = statSync(file).size;
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(size),
    },
    body: JSON.stringify({
      snippet: { title: title.slice(0, 100), description, tags, categoryId: "27", defaultLanguage: "hi", defaultAudioLanguage: "hi" },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false, containsSyntheticMedia: false },
    }),
  });
  if (!init.ok) throw new Error(`Upload init failed ${init.status}: ${await init.text()}`);
  const location = init.headers.get("location");
  const put = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(size) },
    body: readFileSync(file),
  });
  const video = await put.json();
  if (!put.ok) throw new Error(`Upload failed ${put.status}: ${JSON.stringify(video)}`);
  log("uploaded", video.id, video.status?.privacyStatus);
  return { id: video.id, url: `https://youtube.com/shorts/${video.id}`, privacy: video.status?.privacyStatus };
};

if (process.argv[2] === "auth") {
  auth().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
