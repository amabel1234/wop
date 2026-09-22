import { requireRole } from "./_lib/auth.js";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "amabel1234/nixxabl";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const KEY = "site:scripts";

function json(res,status,body){res.status(status).setHeader("Content-Type","application/json; charset=utf-8").setHeader("Cache-Control","no-store").end(JSON.stringify(body));}
function safeName(name,fallback){const clean=String(name||fallback).toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");return clean||fallback;}
function parseDataUrl(value){const match=String(value||"").match(/^data:[^;]+;base64,(.+)$/i);return match?match[1]:"";}
async function redis(command){if(!REDIS_URL||!REDIS_TOKEN)throw new Error("Redis belum dikonfigurasi.");const r=await fetch(`${REDIS_URL}/${command.map(encodeURIComponent).join("/")}`,{headers:{Authorization:`Bearer ${REDIS_TOKEN}`}});const d=await r.json().catch(()=>null);if(!r.ok||!d||d.error)throw new Error(d?.error||`Redis HTTP ${r.status}`);return d.result;}
async function getScripts(){const raw=await redis(["get",KEY]);if(!raw)return [];try{return Array.isArray(raw)?raw:JSON.parse(raw);}catch{return [];}}
async function setScripts(items){return redis(["set",KEY,JSON.stringify(items)]);}
async function github(path,options={}){if(!GITHUB_TOKEN)throw new Error("GITHUB_TOKEN belum diset di Vercel.");const r=await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,{...options,headers:{Accept:"application/vnd.github+json",Authorization:`Bearer ${GITHUB_TOKEN}`,"X-GitHub-Api-Version":"2022-11-28",...(options.headers||{})}});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||`GitHub HTTP ${r.status}`);return d;}
async function uploadToGithub(path,base64,message){let sha;try{sha=(await github(path)).sha;}catch(_){}const body={message,content:base64,branch:GITHUB_BRANCH};if(sha)body.sha=sha;return github(path,{method:"PUT",body:JSON.stringify(body)});}
function auth(req){return requireRole(req,["admin"]);}
function cleanString(v,max=500){return String(v||"").trim().slice(0,max);}

export default async function handler(req,res){try{
  if(req.method==="GET"){return json(res,200,{ok:true,scripts:await getScripts()});}
  if(!auth(req))return json(res,401,{ok:false,message:"Admin token required."});

  if(req.method==="DELETE"){
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    const id=cleanString(body.id,140); if(!id)return json(res,400,{ok:false,message:"ID script wajib diisi."});
    const items=await getScripts(); const next=items.filter(x=>x.id!==id); await setScripts(next); return json(res,200,{ok:true,message:"Produk SC dihapus dari storefront.",scripts:next});
  }

  if(req.method!=="POST")return json(res,405,{ok:false,message:"Method not allowed."});
  const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
  const title=cleanString(body.title,80), price=cleanString(body.price,40), badge=cleanString(body.badge,40), version=cleanString(body.version,30)||"Latest", category=cleanString(body.category,40)||"Script Roblox", description=cleanString(body.description,500);
  const orderLabel=cleanString(body.orderLabel,30)||"Order Sekarang", orderUrl=cleanString(body.orderUrl,400), featured=Boolean(body.featured);
  const features=Array.isArray(body.features)?body.features.map(x=>cleanString(x,120)).filter(Boolean).slice(0,20):[];
  const imageBase64=String(body.imageBase64||""), imageName=safeName(body.imageName,"cover.jpg"), scriptBase64=String(body.scriptBase64||""), scriptName=safeName(body.scriptName,"script.lua");
  if(!title||!price||!description||!scriptBase64||!imageBase64)return json(res,400,{ok:false,message:"Nama, harga, deskripsi, cover JPG, dan file script wajib diisi."});
  if(scriptBase64.length>2_800_000)return json(res,413,{ok:false,message:"File script terlalu besar. Maksimal sekitar 2 MB."});
  if(imageBase64.length>5_500_000)return json(res,413,{ok:false,message:"Cover terlalu besar. Maksimal sekitar 4 MB."});
  if(!/^data:image\/(jpeg|jpg);base64,/i.test(imageBase64))return json(res,400,{ok:false,message:"Cover harus JPG/JPEG."});
  if(!/^data:(application\/octet-stream|text\/plain|text\/lua);base64,/i.test(scriptBase64))return json(res,400,{ok:false,message:"Format file script tidak didukung."});

  const slug=`${Date.now()}-${safeName(title,"script")}`; const scriptPath=`assets/scripts/${slug}-${scriptName}`; const imagePath=`assets/scripts/covers/${slug}-${imageName}`;
  await uploadToGithub(scriptPath,parseDataUrl(scriptBase64),`Add NIXXTEAM script product: ${title}`);
  await uploadToGithub(imagePath,parseDataUrl(imageBase64),`Add NIXXTEAM script cover: ${title}`);
  const item={id:slug,title,price,badge,version,category,description,features,orderLabel,orderUrl,featured,scriptUrl:`https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${scriptPath}`,imageUrl:`https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${imagePath}`,createdAt:new Date().toISOString()};
  const items=await getScripts(); items.unshift(item); const next=items.slice(0,50); await setScripts(next);
  return json(res,200,{ok:true,script:item,scripts:next,message:"Produk SC berhasil dipublish dan ditempatkan di atas produk VVIP Key."});
}catch(error){return json(res,500,{ok:false,message:error.message||"Gagal menyimpan script."});}}
