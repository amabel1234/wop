import { requireRole } from "./_lib/auth.js";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "amabel1234/nixxabl";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const KEY = "site:scripts";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8").end(JSON.stringify(body));
}

function safeName(name, fallback) {
  const clean = String(name || fallback).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return clean || fallback;
}

async function redis(command) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Redis belum dikonfigurasi.");
  const response = await fetch(`${REDIS_URL}/${command.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.error) throw new Error(data?.error || `Redis HTTP ${response.status}`);
  return data.result;
}

async function getScripts() {
  const raw = await redis(["get", KEY]);
  if (!raw) return [];
  try { return Array.isArray(raw) ? raw : JSON.parse(raw); } catch { return []; }
}

async function setScripts(items) {
  return redis(["set", KEY, JSON.stringify(items)]);
}

async function github(path, options = {}) {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN belum diset di Vercel.");
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `GitHub HTTP ${response.status}`);
  return data;
}

async function uploadToGithub(path, base64, message) {
  let sha;
  try {
    const existing = await github(path);
    sha = existing.sha;
  } catch (_) {}

  const body = {
    message,
    content: base64,
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;
  return github(path, { method: "PUT", body: JSON.stringify(body) });
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const scripts = await getScripts();
      return json(res, 200, { ok: true, scripts });
    }

    if (req.method !== "POST") return json(res, 405, { ok: false, message: "Method not allowed." });
    if (!requireRole(req, ["admin"])) return json(res, 401, { ok: false, message: "Admin token required." });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const version = String(body.version || "").trim();
    const category = String(body.category || "Script Roblox").trim();
    const featured = Boolean(body.featured);
    const imageBase64 = String(body.imageBase64 || "");
    const imageName = safeName(body.imageName, "cover.jpg");
    const scriptBase64 = String(body.scriptBase64 || "");
    const scriptName = safeName(body.scriptName, "script.lua");

    if (!title || !scriptBase64) return json(res, 400, { ok: false, message: "Nama script dan file script wajib diisi." });
    if (scriptBase64.length > 2_800_000) return json(res, 413, { ok: false, message: "File script terlalu besar. Maksimal sekitar 2 MB." });
    if (imageBase64.length > 5_500_000) return json(res, 413, { ok: false, message: "Cover JPG terlalu besar. Maksimal sekitar 4 MB." });
    if (imageBase64 && !/^data:image\/(jpeg|jpg);base64,/i.test(imageBase64)) return json(res, 400, { ok: false, message: "Cover harus JPG/JPEG." });
    if (!/^data:application\/octet-stream;base64,/i.test(scriptBase64) && !/^data:text\/plain;base64,/i.test(scriptBase64) && !/^data:text\/lua;base64,/i.test(scriptBase64)) {
      return json(res, 400, { ok: false, message: "Format file script tidak didukung." });
    }

    const slug = `${Date.now()}-${safeName(title, "script")}`;
    const scriptPath = `assets/scripts/${slug}-${scriptName}`;
    const imagePath = imageBase64 ? `assets/scripts/covers/${slug}-${imageName}` : null;

    await uploadToGithub(scriptPath, scriptBase64.split(",")[1], `Add NIXXTEAM script: ${title}`);
    if (imagePath) await uploadToGithub(imagePath, imageBase64.split(",")[1], `Add NIXXTEAM cover: ${title}`);

    const item = {
      id: slug,
      title,
      description,
      version: version || "Latest",
      category: category || "Script Roblox",
      featured,
      scriptUrl: `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${scriptPath}`,
      imageUrl: imagePath ? `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${imagePath}` : "",
      createdAt: new Date().toISOString()
    };

    const scripts = await getScripts();
    scripts.unshift(item);
    await setScripts(scripts.slice(0, 50));
    return json(res, 200, { ok: true, script: item, storeUpdated: true, message: "Script tersimpan di Script Store. Deployment Vercel tidak diperlukan untuk menampilkan produk." });
  } catch (error) {
    return json(res, 500, { ok: false, message: error.message || "Gagal menyimpan script." });
  }
}
