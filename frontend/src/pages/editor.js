/* EDITOR — Canva-like free drag, move, resize signatures on real document */
import { store } from '../utils/store.js';
import { outputAPI, documentAPI } from '../utils/api.js';

const BASE = 'http://localhost:5000/api/v1';
const PW = 595, PH = 842; // A4 PDF points

// ── State ─────────────────────────────────────────────────────────────────────
let placedSigs = []; // {id, page, el, leftPct, topPct, widthPct, heightPct}
let selectedId = null;
let sigCounter = 0;
let sigUrl = null;

export async function renderEditor(app) {
  if (!store.documentId) {
    app.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;">
      <p style="color:var(--text-2);">No document loaded.</p><a href="#/upload" class="btn btn-primary">← Upload</a></div>`;
    return;
  }
  placedSigs = []; selectedId = null; sigCounter = 0;
  const fields = store.detectedFields, sigId = store.signatureId, docId = store.documentId;
  const docName = store.documentName || 'document.pdf', pages = store.pageCount || 1;
  const isPDF = (store.mimeType || 'application/pdf') === 'application/pdf';
  sigUrl = store.signatureImageUrl || null;

  app.innerHTML = buildShell(docName, fields, pages, docId, isPDF);
  await loadDocPages(app, docId, pages, isPDF);
  wireAll(app, { fields, sigId, docId, docName, pages });
  
  // Restore previously saved placements or auto-place detected fields
  await autoPlaceFields(app, fields, store.placements || []);
}

function buildShell(docName, fields, pages, docId, isPDF) {
  return `<div class="editor-layout">
  <div class="editor-topbar">
    <div class="topbar-left"><a href="#/" class="topbar-logo">LS</a><span class="topbar-filename">${docName}</span></div>
    <div class="topbar-center">
      <button id="btn-zoom-in" data-tooltip="Zoom In"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
      <button id="btn-zoom-out" data-tooltip="Zoom Out"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
      <span id="zoom-label" style="font-size:11px;color:var(--text-3);min-width:36px;text-align:center">100%</span>
    </div>
    <div class="topbar-right">
      <button class="btn btn-ghost btn-sm" id="btn-save">Save</button>
      <button class="btn btn-primary btn-sm" id="btn-gen-top">Generate PDF</button>
    </div>
  </div>
  <div class="editor-sidebar-left">
    <span class="section-label">Signature</span>
    <div class="sig-preview-box" id="sig-src" draggable="true">
      ${sigUrl ? `<img src="${sigUrl}" crossorigin="use-credentials" style="max-width:100%;max-height:60px">` : `<span style="font-family:cursive;font-size:1.3rem;color:#1a1a2e">Signature</span>`}
    </div>
    <p class="sig-preview-hint">Drag onto document or click on page to add manually</p>
  </div>
  <div class="editor-canvas" id="editor-canvas">${buildPages(fields, pages)}</div>
  <div class="editor-sidebar-right">
    <span class="section-label">Placed Signatures</span>
    <div id="placed-list"><p style="font-size:var(--text-xs);color:var(--text-3)">None yet — drag or click to place</p></div>
    <div class="divider"></div>
    <span class="section-label">Output Settings</span>
    <div class="output-settings">
      <div class="output-setting"><div class="toggle active" id="toggle-ts"></div><div class="output-setting-text"><div class="label">Timestamp watermark</div><div class="desc">Add signing date to each page</div></div></div>
      <div class="output-setting"><div class="toggle active" id="toggle-audit"></div><div class="output-setting-text"><div class="label">Audit log PDF</div><div class="desc">Generate separate audit trail</div></div></div>
    </div>
    <div class="generate-bottom"><button class="btn btn-primary btn-full" id="btn-gen">Generate Signed PDF</button></div>
  </div>
  <div class="editor-modal-overlay" id="editor-modal"><div class="editor-modal" id="modal-content"></div></div>
</div>`;
}

function buildPages(fields, pages) {
  let h = '';
  for (let p = 1; p <= pages; p++) {
    const pf = fields.filter(f=>f.page===p);
    h += `<div class="doc-page" data-page="${p}">
      <div class="doc-page-content" id="pc-${p}" style="min-height:400px;display:flex;align-items:center;justify-content:center">
        <div style="color:var(--text-3);font-size:var(--text-sm);display:flex;flex-direction:column;align-items:center;gap:8px">
          <div style="width:32px;height:32px;border:3px solid var(--border-1);border-top-color:var(--accent-indigo);border-radius:50%;animation:spin 1s linear infinite"></div>
          Loading page ${p}...</div>
      </div>
      <div class="sig-overlay" id="overlay-${p}" data-page="${p}"></div>
    </div>`;
    if (p < pages) h += `<div class="page-divider">Page ${p+1}</div>`;
  }
  return h || '<p style="color:var(--text-3);padding:40px">No pages.</p>';
}

// ── Load real document content ────────────────────────────────────────────────
async function loadDocPages(app, docId, pages, isPDF) {
  for (let p = 1; p <= pages; p++) {
    const c = app.querySelector(`#pc-${p}`);
    if (!c) continue;
    try {
      const url = documentAPI.pageImageUrl(docId, p);
      if (isPDF) { await renderPDF(c, url); } else { await renderImg(c, url); }
      // Activate overlay after content loads
      const ov = app.querySelector(`#overlay-${p}`);
      if (ov) ov.classList.add('active');
    } catch (e) {
      c.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-3)">⚠️ Page ${p} failed: ${e.message}</div>`;
    }
  }
}

async function renderPDF(c, url) {
  if (!window.pdfjsLib) {
    const mod = await import(/* @vite-ignore */ 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
    window.pdfjsLib = mod;
    mod.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
  }
  const res = await fetch(url, {credentials:'include'});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const pdf = await window.pdfjsLib.getDocument({data: await res.arrayBuffer()}).promise;
  const pg = await pdf.getPage(1);
  const vp = pg.getViewport({scale:1.5});
  const cv = document.createElement('canvas');
  cv.width = vp.width; cv.height = vp.height;
  cv.style.cssText = 'width:100%;height:auto;display:block';
  await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
  c.innerHTML = ''; c.style.minHeight = 'auto'; c.appendChild(cv);
}

function renderImg(c, url) {
  return new Promise((ok, fail) => {
    const img = new Image(); img.crossOrigin = 'use-credentials';
    img.style.cssText = 'width:100%;height:auto;display:block';
    img.onload = () => { c.innerHTML=''; c.style.minHeight='auto'; c.appendChild(img); ok(); };
    img.onerror = () => fail(new Error('Image load failed'));
    img.src = url;
  });
}

// ── Place a signature on a page ──────────────────────────────────────────────
function placeSig(overlay, leftPct, topPct, widthPct, savedHeightPct = null) {
  const id = ++sigCounter;
  const page = parseInt(overlay.dataset.page);
  const hPct = savedHeightPct !== null ? savedHeightPct : (widthPct * 0.35); // aspect ratio approx
  const wrap = document.createElement('div');
  wrap.className = 'placed-sig-wrap';
  wrap.dataset.sigId = id;
  wrap.style.cssText = `left:${leftPct}%;top:${topPct}%;width:${widthPct}%;height:${hPct}%;`;
  wrap.innerHTML = `${sigUrl ? `<img src="${sigUrl}" crossorigin="use-credentials">` : `<span class="sig-text">Signature</span>`}
    <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
    <div class="resize-handle sw"></div><div class="resize-handle se"></div>
    <div class="sig-delete-btn">✕</div>`;
  overlay.appendChild(wrap);
  wrap.style.animation = 'signaturePlace 0.25s ease-out';

  const rec = { id, page, el: wrap, leftPct, topPct, widthPct, heightPct: hPct };
  placedSigs.push(rec);
  selectSig(id);
  setupDrag(wrap, rec, overlay);
  setupResize(wrap, rec, overlay);
  wrap.querySelector('.sig-delete-btn').addEventListener('click', e => { e.stopPropagation(); removeSig(id); });
  wrap.addEventListener('mousedown', e => { if (!e.target.classList.contains('resize-handle')) selectSig(id); });
  updatePlacedList();
  updateGenBtn();
}

function removeSig(id) {
  const idx = placedSigs.findIndex(s => s.id === id);
  if (idx < 0) return;
  placedSigs[idx].el.remove();
  placedSigs.splice(idx, 1);
  if (selectedId === id) selectedId = null;
  updatePlacedList();
  updateGenBtn();
}

function selectSig(id) {
  document.querySelectorAll('.placed-sig-wrap.selected').forEach(el => el.classList.remove('selected'));
  selectedId = id;
  const rec = placedSigs.find(s => s.id === id);
  if (rec) rec.el.classList.add('selected');
  // Highlight in placed list
  document.querySelectorAll('.placed-row').forEach(r => r.classList.toggle('active', r.dataset.sigId == id));
}

// ── Drag to move ─────────────────────────────────────────────────────────────
function setupDrag(wrap, rec, overlay) {
  let dragging = false, sx, sy, sl, st;
  wrap.addEventListener('mousedown', e => {
    if (e.target.classList.contains('resize-handle') || e.target.classList.contains('sig-delete-btn')) return;
    e.preventDefault(); dragging = true;
    const or = overlay.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY;
    sl = rec.leftPct; st = rec.topPct;
    const onMove = ev => {
      if (!dragging) return;
      const dx = (ev.clientX - sx) / or.width * 100;
      const dy = (ev.clientY - sy) / or.height * 100;
      rec.leftPct = clamp(sl + dx, 0, 100 - rec.widthPct);
      rec.topPct = clamp(st + dy, 0, 100 - rec.heightPct);
      wrap.style.left = rec.leftPct + '%';
      wrap.style.top = rec.topPct + '%';
    };
    const onUp = () => { dragging = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── Resize handles ───────────────────────────────────────────────────────────
function setupResize(wrap, rec, overlay) {
  wrap.querySelectorAll('.resize-handle').forEach(h => {
    h.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      const or = overlay.getBoundingClientRect();
      const isLeft = h.classList.contains('nw') || h.classList.contains('sw');
      const isTop = h.classList.contains('nw') || h.classList.contains('ne');
      const startX = e.clientX, startY = e.clientY;
      const sL = rec.leftPct, sT = rec.topPct, sW = rec.widthPct, sH = rec.heightPct;
      const onMove = ev => {
        let dx = (ev.clientX - startX) / or.width * 100;
        let dy = (ev.clientY - startY) / or.height * 100;
        let nw = sW, nh = sH, nl = sL, nt = sT;
        if (isLeft) { nw = Math.max(5, sW - dx); nl = sL + (sW - nw); }
        else { nw = Math.max(5, sW + dx); }
        if (isTop) { nh = Math.max(3, sH - dy); nt = sT + (sH - nh); }
        else { nh = Math.max(3, sH + dy); }
        rec.leftPct = clamp(nl, 0, 95); rec.topPct = clamp(nt, 0, 95);
        rec.widthPct = clamp(nw, 5, 100 - rec.leftPct);
        rec.heightPct = clamp(nh, 3, 100 - rec.topPct);
        wrap.style.left = rec.leftPct + '%'; wrap.style.top = rec.topPct + '%';
        wrap.style.width = rec.widthPct + '%'; wrap.style.height = rec.heightPct + '%';
      };
      const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

// ── Right sidebar placed list ────────────────────────────────────────────────
function updatePlacedList() {
  const list = document.querySelector('#placed-list');
  if (!list) return;
  if (!placedSigs.length) { list.innerHTML = '<p style="font-size:var(--text-xs);color:var(--text-3)">None yet</p>'; return; }
  list.innerHTML = placedSigs.map(s => `<div class="placed-row ${s.id===selectedId?'active':''}" data-sig-id="${s.id}">
    <div class="placed-row-info"><span class="placed-row-label">Signature #${s.id}</span><span class="placed-row-page">Page ${s.page}</span></div>
    <span class="del-btn" data-del="${s.id}">✕</span></div>`).join('');
  list.querySelectorAll('.placed-row').forEach(r => r.addEventListener('click', () => selectSig(+r.dataset.sigId)));
  list.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); removeSig(+e.target.dataset.del); }));
}

function updateGenBtn() {
  const btn = document.querySelector('#btn-gen');
  if (btn) { btn.disabled = placedSigs.length === 0; btn.classList.toggle('disabled', !placedSigs.length); }
}

function buildPlacements(sigId) {
  return placedSigs.map(s => ({
    page: s.page,
    x: (s.leftPct / 100) * PW,
    y: (s.topPct / 100) * PH,
    width: (s.widthPct / 100) * PW,
    height: (s.heightPct / 100) * PH,
    leftPct: s.leftPct,
    topPct: s.topPct,
    widthPct: s.widthPct,
    heightPct: s.heightPct,
    rotation: 0,
    signatureId: sigId || store.signatureId, // fallback to store if sigId is null
  }));
}

// ── Wire everything ──────────────────────────────────────────────────────────
function wireAll(app, { fields, sigId, docId, docName, pages }) {
  // Zoom
  let zoom = 100;
  const cv = app.querySelector('#editor-canvas');
  app.querySelector('#btn-zoom-in')?.addEventListener('click', () => { zoom = Math.min(zoom+10,200); cv.style.zoom=zoom/100; app.querySelector('#zoom-label').textContent=zoom+'%'; });
  app.querySelector('#btn-zoom-out')?.addEventListener('click', () => { zoom = Math.max(zoom-10,50); cv.style.zoom=zoom/100; app.querySelector('#zoom-label').textContent=zoom+'%'; });



  // Toggles
  app.querySelectorAll('.toggle').forEach(t => t.addEventListener('click', () => t.classList.toggle('active')));

  // Click on overlay to place signature
  app.querySelectorAll('.sig-overlay').forEach(ov => {
    ov.addEventListener('click', e => {
      if (e.target.closest('.placed-sig-wrap') || e.target.closest('.sig-zone')) return;
      const r = ov.getBoundingClientRect();
      const lPct = ((e.clientX - r.left) / r.width * 100) - 12;
      const tPct = ((e.clientY - r.top) / r.height * 100) - 4;
      placeSig(ov, clamp(lPct,0,75), clamp(tPct,0,90), 25);
    });
  });



  // Drag from sidebar
  const sigSrc = app.querySelector('#sig-src');
  if (sigSrc) {
    sigSrc.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain','sig'); cv.classList.add('drag-over-canvas'); });
    sigSrc.addEventListener('dragend', () => cv.classList.remove('drag-over-canvas'));
  }
  app.querySelectorAll('.sig-overlay').forEach(ov => {
    ov.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect='copy'; });
    ov.addEventListener('drop', e => {
      e.preventDefault(); cv.classList.remove('drag-over-canvas');
      const r = ov.getBoundingClientRect();
      placeSig(ov, clamp((e.clientX-r.left)/r.width*100-12,0,75), clamp((e.clientY-r.top)/r.height*100-4,0,90), 25);
    });
  });

  // Click outside to deselect
  document.addEventListener('mousedown', e => { if (!e.target.closest('.placed-sig-wrap') && !e.target.closest('.placed-row')) { selectSig(null); } });

  // Delete key
  document.addEventListener('keydown', e => { if ((e.key==='Delete'||e.key==='Backspace') && selectedId) removeSig(selectedId); });

  // Save
  app.querySelector('#btn-save')?.addEventListener('click', async () => {
    try { 
      await documentAPI.savePlacements(docId, buildPlacements(sigId)); 
      toast('Placements saved ✓'); 
    } catch(e) { 
      toast('Save failed: '+e.message, true); 
    }
  });

  // Generate buttons
  [app.querySelector('#btn-gen'), app.querySelector('#btn-gen-top')].forEach(b => {
    if (b) b.addEventListener('click', () => { if (placedSigs.length) showModal(app, {docId, sigId, docName, fields}); });
  });

  updateGenBtn();
}

// ── Processing modal ─────────────────────────────────────────────────────────
const STEPS = ['Validating','Rendering signatures','Compositing pages','Generating PDF','Creating audit trail','Uploading','Generating link'];

async function showModal(app, {docId, sigId, docName, fields}) {
  const ov = app.querySelector('#editor-modal'), mc = app.querySelector('#modal-content');
  ov.classList.add('active');
  mc.innerHTML = `<div class="progress-circle"><svg width="140" height="140" viewBox="0 0 140 140">
    <circle cx="70" cy="70" r="60" fill="none" stroke="var(--border-1)" stroke-width="4"/>
    <circle cx="70" cy="70" r="60" fill="none" stroke="var(--accent-indigo)" stroke-width="4" stroke-linecap="round"
      stroke-dasharray="377" stroke-dashoffset="377" id="pr" style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset .5s"/></svg>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-mono);font-size:var(--text-2xl);font-weight:bold;color:var(--text-1)" id="pp">0%</div></div>
    <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-3);margin-bottom:var(--space-4)">${docName}</div>
    <div class="modal-status" id="ms">Starting...</div>
    <div class="modal-steps" id="mst">${STEPS.map(s=>`<div class="modal-step"><span class="dot"></span><span>${s}</span></div>`).join('')}</div>
    <p class="modal-trust">Your document never leaves our servers unencrypted.</p>`;

  const ring=mc.querySelector('#pr'), pp=mc.querySelector('#pp'), ms=mc.querySelector('#ms'), steps=mc.querySelectorAll('.modal-step');
  let si=0;
  const iv = setInterval(()=>{ if(si>0){steps[si-1].querySelector('.dot').classList.replace('active','done');} if(si<STEPS.length-2){steps[si].querySelector('.dot').classList.add('active');const p=Math.round((si+1)/STEPS.length*100);ring.style.strokeDashoffset=377-377*(si+1)/STEPS.length;pp.textContent=p+'%';ms.textContent=STEPS[si]+'...';si++;}else clearInterval(iv);},700);

  try {
    const placements = buildPlacements(sigId);
    const result = await outputAPI.generate(docId, sigId, placements);
    clearInterval(iv);
    while(si<STEPS.length){steps[si].querySelector('.dot').classList.add('done');si++;} ring.style.strokeDashoffset=0; pp.textContent='100%';
    store.setOutputDocumentId(docId);
    setTimeout(()=>showDone(mc,{docName,fields,downloadUrl:`http://localhost:5000${result.downloadUrl}`}),600);
  } catch(err) {
    clearInterval(iv);
    mc.innerHTML = `<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">⚠️</div>
      <h3 style="color:var(--text-1);margin-bottom:8px">Generation Failed</h3>
      <p style="color:var(--text-3);font-size:var(--text-sm);margin-bottom:24px">${err.message}</p>
      <button class="btn btn-primary" onclick="document.getElementById('editor-modal').classList.remove('active')">Close</button></div>`;
  }
}

function showDone(mc,{docName,fields,downloadUrl}) {
  const now = new Date().toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  mc.innerHTML = `<div class="download-state">
    <div class="success-circle"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg></div>
    <h2 style="font-size:var(--text-2xl);font-weight:bold;color:var(--text-1)">Document Signed Successfully</h2>
    <div class="doc-summary">
      <div><div class="sum-label">Document</div><div class="sum-value">${docName}</div></div>
      <div><div class="sum-label">Pages</div><div class="sum-value">${store.pageCount}</div></div>
      <div><div class="sum-label">Signatures</div><div class="sum-value">${placedSigs.length}</div></div>
      <div><div class="sum-label">Signed</div><div class="sum-value">${now}</div></div>
    </div>
    <a href="${downloadUrl}" download="signed-${docName.replace(/\.[^/.]+$/, '')}.pdf" class="btn btn-primary btn-full btn-lg" style="margin-top:var(--space-4);text-align:center;text-decoration:none">⬇ Download Signed PDF</a>
    <div class="download-links"><a href="#/upload" class="download-link">Sign another →</a><a href="#/dashboard" class="download-link">Dashboard →</a></div>
    <p class="download-info">Available 30 days · Audit trail saved</p></div>`;
}

function toast(msg, err=false) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${err?'#ef4444':'#22c55e'};color:white;padding:10px 18px;border-radius:8px;font-size:14px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.3)`;
  t.textContent = msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3000);
}

async function autoPlaceFields(app, fields, savedPlacements) {
  if (savedPlacements && savedPlacements.length > 0) {
    savedPlacements.forEach(p => {
      const ov = app.querySelector(`#overlay-${p.page}`);
      if (ov) {
        const leftPct = p.leftPct !== undefined ? p.leftPct : (p.x / PW) * 100;
        const topPct = p.topPct !== undefined ? p.topPct : (p.y / PH) * 100;
        const widthPct = p.widthPct !== undefined ? p.widthPct : (p.width / PW) * 100;
        const heightPct = p.heightPct !== undefined ? p.heightPct : (p.height / PH) * 100;
        placeSig(ov, leftPct, topPct, widthPct, heightPct);
      }
    });
    return;
  }

  if (fields && fields.length > 0) {
    // Sort by page ASC, then yPct ASC
    const sortedFields = [...fields].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      const yA = a.yPct !== undefined ? a.yPct : ((PH - a.y - a.height) / PH) * 100;
      const yB = b.yPct !== undefined ? b.yPct : ((PH - b.y - b.height) / PH) * 100;
      return yA - yB;
    });

    for (let i = 0; i < sortedFields.length; i++) {
      const f = sortedFields[i];
      const ov = app.querySelector(`#overlay-${f.page}`);
      if (!ov) continue;

      // Wait for overlay to become active
      let retries = 0;
      while (!ov.classList.contains('active') && retries < 5) {
        await new Promise(r => setTimeout(r, 200));
        retries++;
      }
      
      if (!ov.classList.contains('active')) continue;

      let leftPct, topPct, widthPct, heightPct;
      if (f.xPct !== undefined && f.yPct !== undefined) {
        leftPct = f.xPct;
        topPct = f.yPct;
        widthPct = f.widthPct || 25;
        heightPct = f.heightPct || 12;
      } else {
        leftPct = (f.x / PW) * 100;
        topPct = ((PH - f.y - f.height) / PH) * 100;
        widthPct = (f.width / PW) * 100;
        heightPct = (f.height / PH) * 100;
      }

      placeSig(ov, clamp(leftPct, 0, 95), clamp(topPct, 0, 95), Math.max(widthPct, 15), Math.max(heightPct, 5));
      
      // Staggered delay
      await new Promise(r => setTimeout(r, 150));
    }

    updatePlacedList();
    updateGenBtn();
    toast(`${sortedFields.length} signature field(s) auto-detected and placed`);
  }
}

