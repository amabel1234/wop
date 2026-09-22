(function () {
  "use strict";

  const OWNER_WHATSAPP = "6283182791150";
  const PRODUCTS = [
    {
      title: "VVIP Key / 1 Hari",
      price: "Rp10.000",
      features: [
        "Masa aktif 24 jam setelah aktivasi",
        "Key lisensi personal",
        "Status key dapat dicek online",
        "Panduan aktivasi",
        "Bantuan order melalui WhatsApp",
      ],
    },
    {
      title: "VVIP Key / 7 Hari",
      price: "Rp15.000",
      features: [
        "Masa aktif 7 × 24 jam setelah aktivasi",
        "Key lisensi personal",
        "Detail tanggal aktivasi dan berakhir",
        "Bantuan prioritas",
        "Pembaruan dari kanal resmi",
      ],
    },
    {
      title: "VVIP Key / 30 Hari",
      price: "Rp25.000",
      features: [
        "Masa aktif 30 × 24 jam setelah aktivasi",
        "Key lisensi personal",
        "Detail status dan tanggal berakhir",
        "VIP support",
        "Akses informasi pembaruan resmi",
      ],
    },
    {
      title: "VVIP Key / Lifetime",
      price: "Rp50.000",
      features: [
        "Akses jangka panjang",
        "Key lisensi personal",
        "Pengecekan status key online",
        "Panduan aktivasi",
        "Support owner melalui WhatsApp",
      ],
    },
  ];

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    }[char]));

  const productForCard = (card) => {
    const text = card.textContent.toLowerCase();
    return PRODUCTS.find((product) => text.includes(product.title.toLowerCase().replace("vvip key / ", ""))) ||
      PRODUCTS.find((product) => text.includes(product.title.toLowerCase())) ||
      PRODUCTS[0];
  };

  function addScriptStoreLink() {
    if (document.querySelector('[data-nixx-script-store-link]')) return;
    const navs = document.querySelectorAll('.nav-links, .mobile-links, nav');
    navs.forEach((nav) => {
      if (nav.querySelector('[data-nixx-script-store-link]')) return;
      const link = document.createElement('a');
      link.href = '#nixx-script-store';
      link.textContent = 'Script Store';
      link.dataset.nixxScriptStoreLink = 'true';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('#nixx-script-store')?.scrollIntoView({behavior:'smooth', block:'start'});
      });
      nav.appendChild(link);
    });
  }

  function addNavLink() {
    document.querySelectorAll(".nav-links, .mobile-links").forEach((nav) => {
      if (nav.querySelector("[data-feature-license-link]")) return;
      const link = document.createElement("a");
      link.href = "#roblox-access";
      link.textContent = "Cek key";
      link.dataset.featureLicenseLink = "true";
      nav.appendChild(link);
    });
  }

  function openOrder(product) {
    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = "feature-extension feature-modal-backdrop";
    backdrop.innerHTML = `
      <div class="feature-modal" role="dialog" aria-modal="true" aria-labelledby="feature-order-title">
        <button class="feature-close" type="button" aria-label="Tutup">×</button>
        <span class="feature-eyebrow">DETAIL PRODUK</span>
        <h2 id="feature-order-title">${escapeHtml(product.title)}</h2>
        <p class="feature-price">${escapeHtml(product.price)}</p>
        <ul class="feature-list">${product.features.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        <div class="feature-form">
          <label for="feature-buyer-name">Nama / username</label>
          <input id="feature-buyer-name" autocomplete="name" placeholder="Masukkan nama atau username" required>
          <label for="feature-buyer-note">Catatan (opsional)</label>
          <input id="feature-buyer-note" placeholder="Contoh: mau proses sekarang">
          <button class="feature-submit" type="button">Lanjut ke WhatsApp ↗</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const remove = () => backdrop.remove();
    backdrop.querySelector(".feature-close").addEventListener("click", remove);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) remove();
    });
    const nameInput = backdrop.querySelector("#feature-buyer-name");
    backdrop.querySelector(".feature-submit").addEventListener("click", () => {
      const name = nameInput.value.trim();
      const note = backdrop.querySelector("#feature-buyer-note").value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      const message = [
        `Halo Nixx, saya mau order ${product.title} (${product.price}).`,
        `Nama/username: ${name}.`,
        note ? `Catatan: ${note}` : "",
      ].filter(Boolean).join(" ");
      window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      remove();
    });
    document.addEventListener("keydown", function onEscape(event) {
      if (event.key === "Escape") {
        remove();
        document.removeEventListener("keydown", onEscape);
      }
    });
    nameInput.focus();
  }

  function statusCard(data, input) {
    const status = String(data.status || (data.active ? "active" : data.code || "unknown")).toUpperCase();
    const label = ({ ACTIVE: "AKTIF", ISSUED: "BELUM AKTIF", EXPIRED: "KEDALUWARSA", REVOKED: "DICABUT" })[status] || status;
    const expiry = data.expiresAt ? new Date(data.expiresAt).toLocaleString("id-ID") : "Belum diaktifkan";
    const plan = data.planDays ? `${data.planDays} Hari` : "-";
    return `
      <div class="feature-key-result ${data.active ? "is-active" : "is-inactive"}">
        <div class="feature-key-result-head"><strong>${escapeHtml(data.message || "Status key")}</strong><b>${label}</b></div>
        <div class="feature-key-grid">
          <span>Pembeli<strong>${escapeHtml(data.customer || "-")}</strong></span>
          <span>Paket<strong>${escapeHtml(plan)}</strong></span>
          <span>Berakhir<strong>${escapeHtml(expiry)}</strong></span>
          <span>Key<strong>${escapeHtml(data.key || input)}</strong></span>
        </div>
      </div>
    `;
  }

  function insertLicenseSection() {
    if (document.querySelector("#license-check") || !document.querySelector(".products-section")) return;
    const section = document.createElement("section");
    section.id = "license-check";
    section.className = "feature-extension feature-license-section";
    section.innerHTML = `
      <div class="feature-license-wrap">
        <div>
          <span class="feature-eyebrow">LICENSE STATUS</span>
          <h2>Cek key kamu.</h2>
          <p>Masukkan key untuk melihat status dan masa aktif dari server lisensi.</p>
        </div>
        <form class="feature-license-form">
          <label for="feature-license-key">License key</label>
          <div class="feature-license-input">
            <input id="feature-license-key" placeholder="NIXX-XXXX-XXXX-XXXX" autocomplete="off" required>
            <button class="feature-submit" type="submit">Cek key</button>
          </div>
          <output class="feature-license-output" role="status"></output>
        </form>
      </div>
    `;
    document.querySelector(".products-section").insertAdjacentElement("afterend", section);
    section.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = section.querySelector("#feature-license-key");
      const output = section.querySelector(".feature-license-output");
      const key = input.value.trim();
      if (!key) return;
      output.innerHTML = `<div class="feature-key-loading">Memeriksa key...</div>`;
      try {
        const response = await fetch("/api/license/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const data = await response.json();
        output.innerHTML = statusCard(data, key);
      } catch (error) {
        output.innerHTML = `<div class="feature-key-error">${escapeHtml(error.message || "API license belum tersambung.")}</div>`;
      }
    });
  }


  function insertRobloxAccessSection(){
    if(document.querySelector("#roblox-access") || !document.querySelector(".products-section")) return;
    const section=document.createElement("section");
    section.id="roblox-access";
    section.className="feature-extension feature-license-section nixx-roblox-access-section";
    section.innerHTML=`<div class="feature-license-wrap"><div><span class="feature-eyebrow">ROBLOX ACCESS</span><h2>Akses pakai username.</h2><p>Cukup masukkan username Roblox. Akses aktif 24 jam dan setelah habis bisa daftar lagi.</p><div class="nixx-access-points"><span>✓ Tanpa license key</span><span>✓ 1 akun Roblox = 1 akses aktif</span><span>✓ Reset otomatis setelah 24 jam</span></div></div><form class="feature-license-form nixx-roblox-access-form"><label for="nixx-roblox-username">Username Roblox</label><div class="feature-license-input"><input id="nixx-roblox-username" maxlength="20" autocomplete="off" placeholder="Contoh: Nixxcooll" required><button class="feature-submit" type="submit">Aktifkan Akses</button></div><output class="feature-license-output" role="status"></output></form></div>`;
    document.querySelector(".products-section").insertAdjacentElement("afterend",section);
    const form=section.querySelector("form"), input=section.querySelector("#nixx-roblox-username"), output=section.querySelector("output"), btn=section.querySelector("button");
    form.addEventListener("submit",async e=>{e.preventDefault(); const username=input.value.trim(); if(!username)return; btn.disabled=true; btn.textContent="Checking..."; output.innerHTML=`<div class="feature-key-loading">Mencari akun Roblox dan memeriksa akses...</div>`; try{const r=await fetch("/api/roblox/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username})}); const d=await r.json(); const exp=d.expiresAt?new Date(d.expiresAt).toLocaleString("id-ID"):"-"; output.innerHTML=`<div class="feature-key-result ${d.active?"is-active":"is-inactive"}"><div class="feature-key-result-head"><strong>${escapeHtml(d.message||"Status akses")}</strong><b>${d.active?"AKTIF":"DITOLAK"}</b></div><div class="feature-key-grid"><span>Username<strong>@${escapeHtml(d.username||username)}</strong></span><span>User ID<strong>${escapeHtml(d.userId||"-")}</strong></span><span>Berakhir<strong>${escapeHtml(exp)}</strong></span><span>Sisa<strong>${escapeHtml(formatAccessTime(d.remainingSeconds))}</strong></span></div></div>`;}catch(err){output.innerHTML=`<div class="feature-key-error">${escapeHtml(err.message||"Gagal menghubungi server.")}</div>`;}finally{btn.disabled=false;btn.textContent="Aktifkan Akses";}});
  }

  function formatAccessTime(sec){let s=Math.max(0,Math.floor(Number(sec)||0));const d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);const x=s%60;return d?`${d}h ${h}j ${m}m`:h?`${h}j ${m}m ${x}d`:m?`${m}m ${x}d`:`${x}d`;}

  function closeModal() {
    document.querySelectorAll(".feature-modal-backdrop").forEach((modal) => modal.remove());
  }


  async function insertAnnouncement() {
    if (document.querySelector("[data-nixx-announcement]")) return;
    try {
      const response = await fetch("/api/announcement", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const a = data.announcement;
      if (!a?.enabled || !a.text) return;
      const banner = document.createElement("div");
      banner.dataset.nixxAnnouncement = "true";
      banner.className = `nixx-announcement nixx-announcement-${escapeHtml(a.type || "info")}`;
      banner.innerHTML = `<div class="nixx-announcement-inner"><span class="nixx-announcement-dot"></span><strong>NIXX NEWS</strong><span>${escapeHtml(a.text)}</span></div>`;
      document.body.prepend(banner);
    } catch (_) {}
  }

  function init() {
    addNavLink();
    insertLicenseSection();
    insertRobloxAccessSection();
    insertAnnouncement();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(".product-card button");
    if (button) {
      event.preventDefault();
      event.stopPropagation();
      openOrder(productForCard(button.closest(".product-card")));
    }
  }, true);

  const observer = new MutationObserver(init);
  observer.observe(document.body, { childList: true, subtree: true });
  init();
})();
// NIXXTEAM Script Store: dynamic product-style script cards.
(function initNixxScriptStore(){
  "use strict";
  let section = null;
  let items = [];
  let loading = false;

  function safeUrl(value){
    try {
      const u = new URL(String(value || ""), location.origin);
      return /^https?:$/.test(u.protocol) ? u.href : "";
    } catch { return ""; }
  }

  function openDetail(item){
    document.querySelector("#nixxScriptDetail")?.remove();
    const modal = document.createElement("div");
    modal.id = "nixxScriptDetail";
    modal.className = "nixx-script-modal";
    const image = safeUrl(item.imageUrl);
    const script = safeUrl(item.scriptUrl);
    modal.innerHTML = `<div class="nixx-script-modal-backdrop"></div><div class="nixx-script-modal-box" role="dialog" aria-modal="true"><button class="nixx-script-close" aria-label="Tutup">×</button>${image?`<img class="nixx-script-modal-cover" src="${escapeHtml(image)}" alt="">`:''}<div class="nixx-script-modal-body"><span class="feature-eyebrow">${escapeHtml(item.category || "SCRIPT ROBLOX")}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description || "Script NIXXTEAM siap digunakan.")}</p><div class="nixx-script-detail-meta"><span>VERSION <b>${escapeHtml(item.version || "Latest")}</b></span><span>STATUS <b>AVAILABLE</b></span></div><div class="nixx-script-detail-actions">${script?`<a class="button button-primary" href="${escapeHtml(script)}" target="_blank" rel="noopener noreferrer">Ambil Script ↗</a>`:''}<button class="button nixx-copy-script" type="button">Copy Link</button></div></div></div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector(".nixx-script-close").onclick = close;
    modal.querySelector(".nixx-script-modal-backdrop").onclick = close;
    modal.querySelector(".nixx-copy-script")?.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(script); modal.querySelector(".nixx-copy-script").textContent = "Copied ✓"; } catch {}
    });
  }

  function ensureSection(){
    if (section?.isConnected) return section;
    section = document.querySelector("[data-nixx-script-library]") || document.createElement("section");
    section.className = "nixx-script-section";
    section.id = "nixx-script-store";
    section.dataset.nixxScriptLibrary = "true";
    section.innerHTML = `<div class="nixx-script-head"><div><span class="feature-eyebrow">NIXXTEAM SCRIPT STORE</span><h2>Script Store</h2><p>Script Roblox pilihan NIXXTEAM. Lihat detail, cek versi, lalu ambil script langsung dari web.</p></div><span class="nixx-script-count">0 SCRIPT</span></div><div class="nixx-script-grid"></div>`;
    const anchor = document.querySelector(".products-section") || document.querySelector("main") || document.body;
    anchor.insertAdjacentElement("afterend", section);
    return section;
  }

  function render(){
    const target = ensureSection();
    target.querySelector(".nixx-script-count").textContent = `${items.length} SCRIPT`;
    const grid = target.querySelector(".nixx-script-grid");
    if (!items.length) {
      grid.innerHTML = `<div class="nixx-script-empty"><strong>Belum ada script</strong><span>Script yang dipublish dari Admin akan muncul otomatis di sini.</span></div>`;
      return;
    }
    grid.innerHTML = items.map((item,index) => {
      const image = safeUrl(item.imageUrl);
      const featured = item.featured ? '<span class="nixx-featured">FEATURED</span>' : '';
      const script = safeUrl(item.scriptUrl);
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "-";
      return `<article class="nixx-script-card ${item.featured?'is-featured':''}" data-script-index="${index}"><div class="nixx-script-media">${image?`<img class="nixx-script-cover" src="${escapeHtml(image)}" alt="${escapeHtml(item.title)}" loading="lazy">`:'<div class="nixx-script-cover nixx-script-cover-empty">NIXXTEAM</div>'}${featured}</div><div class="nixx-script-body"><span class="nixx-script-category">${escapeHtml(item.category || "SCRIPT ROBLOX")}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || "Script NIXXTEAM siap digunakan.")}</p><div class="nixx-script-meta"><span>${escapeHtml(item.version || "Latest")}</span><span>${escapeHtml(date)}</span></div><div class="nixx-script-actions"><button class="button nixx-detail-button" type="button">Lihat Detail</button>${script?`<a class="button button-primary" href="${escapeHtml(script)}" target="_blank" rel="noopener noreferrer">Ambil Script ↗</a>`:''}</div></div></article>`;
    }).join("");
  }

  async function load(){
    if (loading) return;
    loading = true;
    try {
      const response = await fetch(`/api/scripts?ts=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      items = Array.isArray(data.scripts) ? data.scripts : [];
      render();
    } catch (_) {
      // Store is optional; keep the rest of the storefront working.
    } finally { loading = false; }
  }

  document.addEventListener("click", (event) => {
    const card = event.target.closest?.(".nixx-script-card");
    if (!card || !items.length) return;
    if (event.target.closest(".nixx-detail-button")) {
      openDetail(items[Number(card.dataset.scriptIndex)]);
    }
  });

  // Admin publish -> refresh immediately when this page is open.
  window.addEventListener("nixx:script-published", load);

  // New products are stored in Redis/GitHub at runtime, so no Vercel redeploy is needed.
  addScriptStoreLink();
  load();
  window.setInterval(load, 10000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
})();

// NIXX Manual Product Store — products published from Admin appear automatically.
(function initNixxManualProducts(){
  "use strict";
  let items = [];
  let section = null;
  let loading = false;
  const escape = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const safeUrl = (value) => { try { const u = new URL(String(value || ""), location.origin); return /^https?:$/.test(u.protocol) ? u.href : ""; } catch { return ""; } };

  function ensureSection(){
    if (section?.isConnected) return section;
    section = document.createElement("section");
    section.id = "nixx-manual-products";
    section.className = "nixx-manual-products section";
    section.innerHTML = `<div class="container"><div class="section-heading"><div><span class="section-number">NIXX PRODUCT STORE</span><h2>Produk pilihan.</h2></div><p>Produk yang kamu pasang sendiri dari Admin akan tampil otomatis di sini dengan layout yang rapi.</p></div><div class="nixx-manual-product-grid"></div></div>`;
    const anchor = document.querySelector(".products-section") || document.querySelector(".plan-grid")?.closest("section") || document.querySelector("main");
    if (anchor) anchor.insertAdjacentElement("afterend", section); else document.body.appendChild(section);
    return section;
  }

  function openDetail(product){
    document.querySelector("#nixxManualProductDetail")?.remove();
    const modal = document.createElement("div");
    modal.id = "nixxManualProductDetail";
    modal.className = "product-detail-backdrop";
    const image = safeUrl(product.imageUrl);
    const features = Array.isArray(product.features) ? product.features : [];
    modal.innerHTML = `<div class="product-detail nixx-manual-detail">${image ? `<img class="nixx-manual-detail-image" src="${escape(image)}" alt="${escape(product.title)}">` : ""}<button class="close product-detail-close" type="button" aria-label="Tutup">×</button><span class="section-number">${escape(product.badge || "PRODUK NIXX")}</span><h2>${escape(product.title)}</h2><p class="product-detail-description">${escape(product.description || "Produk NIXX.")}</p><div class="product-detail-price"><b>${escape(product.price)}</b><span>Produk tersedia</span></div>${features.length ? `<h3>Yang termasuk</h3><ul class="product-detail-features">${features.map((x)=>`<li>${escape(x)}</li>`).join("")}</ul>` : ""}<button class="button button-primary button-full nixx-manual-order" type="button">${escape(product.orderLabel || "Beli / Tanya")} ↗</button></div>`;
    document.body.appendChild(modal);
    const close=()=>modal.remove();
    modal.querySelector(".product-detail-close").onclick=close;
    modal.addEventListener("click",e=>{if(e.target===modal)close();});
    modal.querySelector(".nixx-manual-order").onclick=()=>{ const msg=`Halo admin NIXX, saya ingin order ${product.title} (${product.price}).`; window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`,"_blank","noopener,noreferrer"); };
  }

  function render(){
    const target=ensureSection();
    const grid=target.querySelector(".nixx-manual-product-grid");
    if(!items.length){ target.hidden=true; return; }
    target.hidden=false;
    grid.innerHTML=items.map((p,i)=>{ const image=safeUrl(p.imageUrl); const features=Array.isArray(p.features)?p.features:[]; return `<article class="plan nixx-manual-product-card ${i===0?'nixx-manual-featured':''}" data-index="${i}"><div class="nixx-manual-media">${image?`<img src="${escape(image)}" alt="${escape(p.title)}" loading="lazy">`:`<div class="nixx-manual-placeholder">NIXX</div>`}<span class="plan-kicker">${escape(p.badge||"PRODUK NIXX")}</span></div><h3>${escape(p.title)}</h3><strong class="price">${escape(p.price)}</strong><p>${escape(p.description||"Produk NIXX.")}</p>${features.length?`<ul>${features.slice(0,3).map(x=>`<li>${escape(x)}</li>`).join("")}</ul>`:""}<button class="button button-full button-primary nixx-manual-detail-button" type="button">${escape(p.orderLabel||"Beli / Tanya")} ↗</button></article>`; }).join("");
    grid.querySelectorAll(".nixx-manual-detail-button").forEach(btn=>btn.addEventListener("click",()=>openDetail(items[Number(btn.closest(".nixx-manual-product-card").dataset.index)])));
  }
  async function load(){
    if(loading)return; loading=true;
    try{
      const r=await fetch(`/api/products?ts=${Date.now()}`,{cache:"no-store",headers:{"Accept":"application/json"}});
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d.message || `HTTP ${r.status}`);
      items=Array.isArray(d.products)?d.products:[];
      render();
    }catch(error){
      // Jangan menghilangkan storefront kalau API produk sedang gagal.
      // Coba lagi otomatis pada interval berikutnya.
      console.warn("NIXX products API:", error?.message || error);
    }finally{loading=false;}
  }
  window.addEventListener("nixx:product-published",()=>{load();});
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",load,{once:true});
  else load();
  window.setInterval(load,5000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)load();});
})();
