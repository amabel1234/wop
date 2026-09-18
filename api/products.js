import { requireRole } from "./_lib/auth.js";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "amabel1234/nixxabl";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const KEY = "site:products";

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

async function getProducts() {
  const raw = await redis(["get", KEY]);
  if (!raw) return [];
  try { return Array.isArray(raw) ? raw : JSON.parse(raw); } catch { return []; }
}

async function setProducts(items) {
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
  try { sha = (await github(path)).sha; } catch (_) {}
  const body = { message, content: base64, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;
  return github(path, { method: "PUT", body: JSON.stringify(body) });
}

async function deleteGithub(path) {
  if (!path || !GITHUB_TOKEN) return;
  try {
    const existing = await github(path);
    await github(path, { method: "DELETE", body: JSON.stringify({ message: `Remove NIXX product asset: ${path}`, sha: existing.sha, branch: GITHUB_BRANCH }) });
  } catch (_) {}
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return json(res, 200, { ok: true, products: await getProducts() });
    }

    if (!requireRole(req, ["admin"])) return json(res, 401, { ok: false, message: "Admin token required." });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    if (req.method === "DELETE") {
      const id = String(body.id || req.query?.id || "").trim();
      if (!id) return json(res, 400, { ok: false, message: "ID produk wajib diisi." });
      const products = await getProducts();
      const found = products.find((item) => item.id === id);
      if (!found) return json(res, 404, { ok: false, message: "Produk tidak ditemukan." });
      await setProducts(products.filter((item) => item.id !== id));
      if (found.imagePath) await deleteGithub(found.imagePath);
      return json(res, 200, { ok: true, message: "Produk dihapus." });
    }

    if (req.method !== "POST") return json(res, 405, { ok: false, message: "Method not allowed." });

    const title = String(body.title || "").trim();
    const price = String(body.price || "").trim();
    const badge = String(body.badge || "PRODUK NIXX").trim();
    const description = String(body.description || "").trim();
    const orderLabel = String(body.orderLabel || "Beli / Tanya").trim();
    const features = Array.isArray(body.features)
      ? body.features.map((x) => String(x).trim()).filter(Boolean).slice(0, 8)
      : String(body.features || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 8);
    const imageBase64 = String(body.imageBase64 || "");
    const imageName = safeName(body.imageName, "product.jpg");

    if (!title || !price) return json(res, 400, { ok: false, message: "Nama produk dan harga wajib diisi." });
    if (description.length > 400) return json(res, 400, { ok: false, message: "Deskripsi maksimal 400 karakter." });
    if (imageBase64.length > 5_500_000) return json(res, 413, { ok: false, message: "Gambar terlalu besar. Maksimal sekitar 4 MB." });
    if (imageBase64 && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(imageBase64)) return json(res, 400, { ok: false, message: "Gambar harus JPG, PNG, atau WEBP." });

    const id = `${Date.now()}-${safeName(title, "product")}`;
    const imagePath = imageBase64 ? `assets/products/custom/${id}-${imageName}` : null;
    if (imagePath) await uploadToGithub(imagePath, imageBase64.split(",")[1], `Add NIXX product: ${title}`);

    const item = {
      id, title, price, badge: badge || "PRODUK NIXX", description,
      features,
      orderLabel: orderLabel || "Beli / Tanya",
      imageUrl: imagePath ? `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${imagePath}` : "",
      imagePath,
      createdAt: new Date().toISOString()
    };

    const products = await getProducts();
    products.unshift(item);
    await setProducts(products.slice(0, 50));
    return json(res, 200, { ok: true, product: item, message: "Produk berhasil dipublish." });
  } catch (error) {
    return json(res, 500, { ok: false, message: error.message || "Gagal mengelola produk." });
  }
}
