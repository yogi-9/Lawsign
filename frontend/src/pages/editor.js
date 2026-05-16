/* EDITOR PAGE */
const checkSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`;

const FIELDS = [
  { id:1, page:1, label:'Party 1 — Signature', x:'60%', y:'75%', w:'120px', h:'44px' },
  { id:2, page:1, label:'Party 2 — Signature', x:'60%', y:'85%', w:'120px', h:'44px' },
  { id:3, page:2, label:'Witness 1', x:'15%', y:'80%', w:'110px', h:'40px' },
  { id:4, page:2, label:'Witness 2', x:'55%', y:'80%', w:'110px', h:'40px' },
  { id:5, page:3, label:'Notary', x:'35%', y:'88%', w:'130px', h:'44px' },
];

const PROCESS_STEPS = ['Validating placements','Rendering signatures','Compositing pages','Generating PDF','Creating audit trail','Uploading to storage','Generating download link'];

export function renderEditor(app) {
  const signed = new Set();

  app.innerHTML = `<div class="editor-layout">
    <!-- Top Bar -->
    <div class="editor-topbar">
      <div class="topbar-left">
        <a href="#/" class="topbar-logo">LS</a>
        <span class="topbar-filename">rental_agreement_final.pdf</span>
      </div>
      <div class="topbar-center">
        <button data-tooltip="Undo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
        <button data-tooltip="Redo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg></button>
        <span class="divider-vertical"></span>
        <button data-tooltip="Zoom In"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
        <button data-tooltip="Zoom Out"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
        <button data-tooltip="Fit Page"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>
      </div>
      <div class="topbar-right">
        <button class="btn btn-ghost btn-sm">Save</button>
        <button class="btn btn-primary btn-sm" id="topbar-generate">Generate PDF</button>
      </div>
    </div>

    <!-- Left Sidebar -->
    <div class="editor-sidebar-left">
      <span class="section-label">Signature</span>
      <div class="sig-preview-box">
        <div style="font-family:var(--font-serif);font-style:italic;font-size:1.4rem;color:#1a1a2e;cursor:grab;user-select:none;" id="draggable-sig" draggable="true">J. Sharma</div>
      </div>
      <p class="sig-preview-hint">Drag onto document or click any detected zone</p>
      
      <span class="section-label">Style</span>
      <div class="sig-variants">
        <div class="sig-variant active">Signature</div>
        <div class="sig-variant">Initials</div>
        <div class="sig-variant">Printed</div>
      </div>

      <span class="section-label">Size</span>
      <div class="size-slider">
        <input type="range" min="50" max="150" value="100" id="sig-size">
        <span class="size-val" id="sig-size-val">100%</span>
      </div>

      <div class="divider"></div>
      <div class="editor-tools">
        <button class="editor-tool-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Add Date Stamp</button>
        <button class="editor-tool-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="12" y1="18" x2="12" y2="12"/></svg> Add Page Number</button>
      </div>

      <div class="divider"></div>
      <div class="checklist-section">
        <span class="section-label">Fields to sign</span>
        <div class="checklist-items" id="checklist">
          ${FIELDS.map(f => `<div class="checklist-item" data-field="${f.id}">
            <div class="check-circle" data-field="${f.id}"></div>
            <span>${f.label}</span>
            <span class="page-num">P${f.page}</span>
          </div>`).join('')}
        </div>
        <div class="checklist-success" id="checklist-success">All fields signed ✓</div>
      </div>
    </div>

    <!-- Canvas -->
    <div class="editor-canvas" id="editor-canvas">
      ${renderPages()}
    </div>

    <!-- Right Sidebar -->
    <div class="editor-sidebar-right">
      <span class="section-label">Placed Signatures</span>
      <div class="placed-list" id="placed-list">
        <p style="font-size:var(--text-xs);color:var(--text-3);">No signatures placed yet</p>
      </div>
      
      <div class="divider"></div>
      <span class="section-label">Output Settings</span>
      <div class="output-settings">
        <div class="output-setting">
          <div class="toggle active" id="toggle-timestamp"></div>
          <div class="output-setting-text">
            <div class="label">Timestamp watermark</div>
            <div class="desc">Add signing date to each page</div>
          </div>
        </div>
        <div class="output-setting">
          <div class="toggle active" id="toggle-audit"></div>
          <div class="output-setting-text">
            <div class="label">Audit log PDF</div>
            <div class="desc">Generate separate audit trail</div>
          </div>
        </div>
      </div>

      <div class="generate-bottom">
        <button class="btn btn-primary btn-full disabled" id="btn-generate" disabled>Generate Signed PDF</button>
      </div>
    </div>

    <!-- Processing / Download Modal -->
    <div class="editor-modal-overlay" id="editor-modal">
      <div class="editor-modal" id="modal-content"></div>
    </div>
  </div>`;

  // Wire interactions
  initEditorInteractions(app, signed);
}

function renderPages() {
  let html = '';
  for (let p = 1; p <= 3; p++) {
    const pageFields = FIELDS.filter(f => f.page === p);
    html += `<div class="doc-page" data-page="${p}">
      <div class="doc-page-lines">
        ${Array.from({length: p === 1 ? 18 : 14}, (_,i) => {
          const w = [90,70,85,60,95,40,80,75,65,88,50,70,90,55,85,70,60,45][i % 18];
          return `<div class="doc-page-line" style="width:${w}%"></div>`;
        }).join('')}
      </div>
      ${pageFields.map(f => `<div class="sig-zone" data-field="${f.id}" style="left:${f.x};top:${f.y};width:${f.w};height:${f.h};">
        <span class="sig-zone-label">Tap to sign</span>
      </div>`).join('')}
    </div>`;
    if (p < 3) html += `<div class="page-divider">Page ${p + 1}</div>`;
  }
  return html;
}

function initEditorInteractions(app, signed) {
  // Signature size slider
  const slider = app.querySelector('#sig-size');
  const sizeVal = app.querySelector('#sig-size-val');
  if (slider) slider.addEventListener('input', () => { sizeVal.textContent = slider.value + '%'; });

  // Toggle switches
  app.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', () => t.classList.toggle('active'));
  });

  // Signature variant selection
  app.querySelectorAll('.sig-variant').forEach(v => {
    v.addEventListener('click', () => {
      app.querySelectorAll('.sig-variant').forEach(x => x.classList.remove('active'));
      v.classList.add('active');
    });
  });

  // Click to sign zones
  app.querySelectorAll('.sig-zone').forEach(zone => {
    zone.addEventListener('click', () => {
      const fid = parseInt(zone.dataset.field);
      if (signed.has(fid)) return;
      placeSignature(app, zone, fid, signed);
    });
  });

  // Generate buttons
  const genBtn = app.querySelector('#btn-generate');
  const topGenBtn = app.querySelector('#topbar-generate');
  [genBtn, topGenBtn].forEach(btn => {
    if(btn) btn.addEventListener('click', () => {
      if (signed.size === 0) return;
      showProcessingModal(app);
    });
  });
}

function placeSignature(app, zone, fid, signed) {
  signed.add(fid);
  zone.classList.add('signed');
  zone.innerHTML = `<span class="placed-sig">J. Sharma</span>`;

  // Update checklist
  const item = app.querySelector(`.checklist-item[data-field="${fid}"]`);
  if (item) {
    item.classList.add('done');
    const circle = item.querySelector('.check-circle');
    circle.classList.add('checked');
    circle.innerHTML = checkSvg;
  }

  // Update placed list
  const field = FIELDS.find(f => f.id === fid);
  const list = app.querySelector('#placed-list');
  if (signed.size === 1) list.innerHTML = '';
  list.innerHTML += `<div class="placed-row" data-field="${fid}">
    <span style="font-family:var(--font-serif);font-style:italic;font-size:var(--text-sm);color:var(--text-1);">J. Sharma</span>
    <span style="font-size:var(--text-xs);color:var(--text-2);">Page ${field.page}</span>
    <span class="coords">${field.x}, ${field.y}</span>
  </div>`;

  // Check all signed
  if (signed.size === FIELDS.length) {
    const success = app.querySelector('#checklist-success');
    if (success) success.classList.add('visible');
    const genBtn = app.querySelector('#btn-generate');
    if (genBtn) { genBtn.disabled = false; genBtn.classList.remove('disabled'); genBtn.classList.add('btn-glow-pulse'); }
  }
}

function showProcessingModal(app) {
  const overlay = app.querySelector('#editor-modal');
  const content = app.querySelector('#modal-content');
  overlay.classList.add('active');

  content.innerHTML = `
    <div class="progress-circle">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="60" fill="none" stroke="var(--border-1)" stroke-width="4"/>
        <circle cx="70" cy="70" r="60" fill="none" stroke="var(--accent-indigo)" stroke-width="4" stroke-linecap="round"
          stroke-dasharray="377" stroke-dashoffset="377" id="progress-ring" style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset 0.5s ease-out;"/>
      </svg>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-mono);font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--text-1);" id="progress-pct">0%</div>
    </div>
    <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-3);margin-bottom:var(--space-4);">rental_agreement_final.pdf</div>
    <div class="modal-status" id="modal-status">Starting...</div>
    <div class="modal-steps" id="modal-steps">
      ${PROCESS_STEPS.map(s => `<div class="modal-step"><span class="dot"></span><span>${s}</span></div>`).join('')}
    </div>
    <p class="modal-trust">Your document never leaves our servers unencrypted. Auto-deleted in 30 days.</p>
  `;

  // Animate progress
  const ring = content.querySelector('#progress-ring');
  const pct = content.querySelector('#progress-pct');
  const status = content.querySelector('#modal-status');
  const steps = content.querySelectorAll('.modal-step');
  let step = 0;
  const total = PROCESS_STEPS.length;

  function tick() {
    if (step > 0) {
      steps[step-1].querySelector('.dot').classList.remove('active');
      steps[step-1].querySelector('.dot').classList.add('done');
      steps[step-1].querySelector('span:last-child').classList.remove('active');
      steps[step-1].querySelector('span:last-child').classList.add('done');
    }
    if (step < total) {
      steps[step].querySelector('.dot').classList.add('active');
      steps[step].querySelector('span:last-child').classList.add('active');
      const progress = ((step+1)/total*100).toFixed(0);
      ring.style.strokeDashoffset = 377 - (377 * (step+1)/total);
      pct.textContent = progress + '%';
      status.textContent = PROCESS_STEPS[step] + '...';
      step++;
      setTimeout(tick, 700 + Math.random()*300);
    } else {
      pct.textContent = '100%';
      ring.style.strokeDashoffset = 0;
      setTimeout(() => showDownloadState(content), 600);
    }
  }
  setTimeout(tick, 400);
}

function showDownloadState(content) {
  content.innerHTML = `<div class="download-state">
    <div class="success-circle">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
    </div>
    <h2 style="font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--text-1);">Document Signed Successfully</h2>
    <div class="doc-summary">
      <div><div class="sum-label">Document</div><div class="sum-value">rental_agreement_final.pdf</div></div>
      <div><div class="sum-label">Pages</div><div class="sum-value">3</div></div>
      <div><div class="sum-label">Signatures</div><div class="sum-value">${FIELDS.length}</div></div>
      <div><div class="sum-label">Signed</div><div class="sum-value">14 May 2026, 10:30 AM</div></div>
    </div>
    <button class="btn btn-primary btn-full btn-lg" style="margin-top:var(--space-4);" onclick="this.textContent='Downloading...';this.style.opacity=0.7;">Download Signed PDF</button>
    <div class="download-links">
      <a href="#/upload" class="download-link">Sign another document →</a>
      <a href="#/dashboard" class="download-link">View dashboard →</a>
    </div>
    <p class="download-info">File available for 30 days · Audit trail saved · Share via secure link</p>
  </div>`;
}
