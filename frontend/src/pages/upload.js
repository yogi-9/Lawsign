import { createNavbar } from '../components/navbar.js';
import { documentAPI, signatureAPI, authAPI } from '../utils/api.js';
import { store } from '../utils/store.js';

const checkSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`;

const STEPS = [
  'Validating document format',
  'Reading document structure',
  'Converting pages to high resolution',
  'Analyzing text layout',
  'Detecting signature zones',
  'Processing signatures',
  'Removing backgrounds',
  'Ready',
];

export function renderUpload(app) {
  app.innerHTML = '';
  app.appendChild(createNavbar());

  const state = { doc: null, sigs: [] }; // sigs is now an array of File objects

  const main = document.createElement('div');
  main.className = 'upload-page page-container';
  main.innerHTML = `
    <div class="upload-container">
      <div class="stepper">
        <div class="stepper-step"><div class="stepper-circle active">1</div><span class="stepper-label active">Upload</span></div>
        <div class="stepper-line"></div>
        <div class="stepper-step"><div class="stepper-circle">2</div><span class="stepper-label">Editor</span></div>
        <div class="stepper-line"></div>
        <div class="stepper-step"><div class="stepper-circle">3</div><span class="stepper-label">Download</span></div>
      </div>

      <div class="upload-zones">
        <div class="upload-zone" id="zone-doc">
          <div class="upload-zone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div class="upload-zone-primary">Drop your document here</div>
          <div class="upload-zone-secondary">PDF, DOCX, JPG, PNG — up to 50MB</div>
          <div class="upload-zone-hint">Rental agreements, sale deeds, affidavits, contracts — all supported</div>
          <div class="upload-zone-security">🔒 End-to-end encrypted</div>
          <input type="file" id="input-doc" accept=".pdf,.docx,.doc,.jpg,.jpeg,.png" style="display:none">
        </div>
        <div class="upload-zone upload-zone-sig" id="zone-sig">
          <div class="upload-zone-icon sig-zone-default-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 19c-4 0-7-1-9-3"/><path d="M3 16c2-3 4-8 7-8s3 3 5 3 3-2 5-2"/><path d="M20 9v0"/></svg>
          </div>
          <div class="upload-zone-primary sig-zone-default-text">Drop your signature photos here</div>
          <div class="upload-zone-secondary sig-zone-default-sub">Upload one or more signatures — JPG, PNG, WEBP</div>
          <div class="upload-zone-hint sig-zone-default-hint">Tip: photograph on white paper in good lighting for best results</div>
          <div class="sig-gallery" id="sig-gallery" style="display:none"></div>
          <button class="sig-add-more-btn" id="sig-add-more" style="display:none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add more signatures
          </button>
          <input type="file" id="input-sig" accept=".jpg,.jpeg,.png,.webp" style="display:none" multiple>
        </div>
      </div>

      <div id="upload-error" style="display:none;color:#ef4444;text-align:center;margin-top:12px;font-size:var(--text-sm);"></div>

      <div class="upload-proceed">
        <button class="btn btn-primary btn-lg disabled" id="btn-proceed" disabled>Proceed to Editor</button>
      </div>
      <p class="upload-security-note">Your files are encrypted during upload and storage. Never shared. Never used for training.</p>
    </div>

    <div class="processing-overlay" id="processing-overlay">
      <div class="processing-panel">
        <h3 style="font-weight:var(--weight-bold);color:var(--text-1);">Preparing your document</h3>
        <div class="shimmer-bar"></div>
        <div class="processing-steps" id="processing-steps">
          ${STEPS.map(s => `<div class="processing-step"><div class="step-status"></div><span class="step-text">${s}</span></div>`).join('')}
        </div>
      </div>
    </div>
  `;

  app.appendChild(main);

  // ── Wire document upload zone ──────────────────────────────────────────────
  const zoneDoc = main.querySelector('#zone-doc');
  const inputDoc = main.querySelector('#input-doc');

  zoneDoc.addEventListener('click', () => inputDoc.click());
  zoneDoc.addEventListener('dragover', e => { e.preventDefault(); zoneDoc.classList.add('dragover'); });
  zoneDoc.addEventListener('dragleave', () => zoneDoc.classList.remove('dragover'));
  zoneDoc.addEventListener('drop', e => {
    e.preventDefault();
    zoneDoc.classList.remove('dragover');
    handleDocFile(e.dataTransfer.files[0]);
  });
  inputDoc.addEventListener('change', e => { if (e.target.files[0]) handleDocFile(e.target.files[0]); });

  // ── Wire signature upload zone ─────────────────────────────────────────────
  const zoneSig = main.querySelector('#zone-sig');
  const inputSig = main.querySelector('#input-sig');
  const addMoreBtn = main.querySelector('#sig-add-more');

  // Clicking the zone or the add-more button opens file picker
  zoneSig.addEventListener('click', e => {
    // Don't trigger file input if clicking remove buttons or add-more button
    if (e.target.closest('.sig-thumb-remove') || e.target.closest('#sig-add-more')) return;
    if (state.sigs.length > 0) return; // If gallery visible, only add-more opens picker
    inputSig.click();
  });
  addMoreBtn.addEventListener('click', e => {
    e.stopPropagation();
    inputSig.click();
  });

  zoneSig.addEventListener('dragover', e => { e.preventDefault(); zoneSig.classList.add('dragover'); });
  zoneSig.addEventListener('dragleave', () => zoneSig.classList.remove('dragover'));
  zoneSig.addEventListener('drop', e => {
    e.preventDefault();
    zoneSig.classList.remove('dragover');
    handleSigFiles(e.dataTransfer.files);
  });
  inputSig.addEventListener('change', e => {
    if (e.target.files.length) handleSigFiles(e.target.files);
    inputSig.value = ''; // Reset so same file can be selected again
  });

  // ── Document file handler ─────────────────────────────────────────────────
  function handleDocFile(file) {
    if (!file) return;
    state.doc = file;
    zoneDoc.classList.add('has-file');

    const isImage = file.type.startsWith('image');
    let preview = '';
    if (isImage) {
      const url = URL.createObjectURL(file);
      preview = `<img src="${url}" alt="Preview" style="max-height:80px;border-radius:4px;">`;
    } else {
      preview = `<div style="width:80px;height:100px;background:white;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>`;
    }

    zoneDoc.innerHTML = `<div class="upload-file-preview">
      ${preview}
      <div class="upload-file-name">${file.name}</div>
      <div class="upload-file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
      <button class="upload-file-remove" data-type="doc">× Remove</button>
    </div>`;

    zoneDoc.querySelector('.upload-file-remove').addEventListener('click', e => {
      e.stopPropagation();
      state.doc = null;
      zoneDoc.classList.remove('has-file');
      resetDocZone();
      updateProceed();
    });

    updateProceed();
  }

  function resetDocZone() {
    zoneDoc.innerHTML = `
      <div class="upload-zone-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div class="upload-zone-primary">Drop your document here</div>
      <div class="upload-zone-secondary">PDF, DOCX, JPG, PNG — up to 50MB</div>
      <input type="file" id="input-doc" accept=".pdf,.docx,.doc,.jpg,.jpeg,.png" style="display:none">
    `;
    const newInput = zoneDoc.querySelector('#input-doc');
    zoneDoc.addEventListener('click', () => newInput.click());
    newInput.addEventListener('change', e => { if (e.target.files[0]) handleDocFile(e.target.files[0]); });
  }

  // ── Signature files handler (supports multiple) ───────────────────────────
  function handleSigFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image'));
    if (!files.length) return;

    // Append to existing signatures
    state.sigs.push(...files);
    zoneSig.classList.add('has-file');
    renderSigGallery();
    updateProceed();
  }

  function removeSig(index) {
    state.sigs.splice(index, 1);
    if (state.sigs.length === 0) {
      zoneSig.classList.remove('has-file');
      resetSigZone();
    } else {
      renderSigGallery();
    }
    updateProceed();
  }

  function resetSigZone() {
    // Show default content, hide gallery
    zoneSig.querySelectorAll('.sig-zone-default-icon, .sig-zone-default-text, .sig-zone-default-sub, .sig-zone-default-hint').forEach(el => el.style.display = '');
    main.querySelector('#sig-gallery').style.display = 'none';
    main.querySelector('#sig-add-more').style.display = 'none';
  }

  function renderSigGallery() {
    // Hide default content
    zoneSig.querySelectorAll('.sig-zone-default-icon, .sig-zone-default-text, .sig-zone-default-sub, .sig-zone-default-hint').forEach(el => el.style.display = 'none');

    const gallery = main.querySelector('#sig-gallery');
    const addMore = main.querySelector('#sig-add-more');
    gallery.style.display = 'grid';
    addMore.style.display = 'flex';

    gallery.innerHTML = state.sigs.map((file, i) => {
      const url = URL.createObjectURL(file);
      return `<div class="sig-thumb" data-index="${i}">
        <div class="sig-thumb-img-wrap">
          <img src="${url}" alt="${file.name}">
        </div>
        <div class="sig-thumb-name">${file.name}</div>
        <div class="sig-thumb-size">${(file.size / 1024).toFixed(0)} KB</div>
        <button class="sig-thumb-remove" data-index="${i}">✕</button>
      </div>`;
    }).join('');

    gallery.querySelectorAll('.sig-thumb-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        removeSig(parseInt(btn.dataset.index));
      });
    });
  }

  function updateProceed() {
    const btn = main.querySelector('#btn-proceed');
    if (state.doc && state.sigs.length > 0) {
      btn.disabled = false;
      btn.classList.remove('disabled');
    } else {
      btn.disabled = true;
      btn.classList.add('disabled');
    }
  }

  function showError(msg) {
    const el = main.querySelector('#upload-error');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 6000);
  }

  // ── Proceed button — real API upload ──────────────────────────────────────────
  main.querySelector('#btn-proceed').addEventListener('click', async () => {
    if (!state.doc || !state.sigs.length) return;

    const overlay = main.querySelector('#processing-overlay');
    const steps   = overlay.querySelectorAll('.processing-step');
    overlay.classList.add('active');

    // Animate first 5 fake steps while real upload happens in background
    let i = 0;
    function animateStep() {
      if (i > 0) {
        steps[i-1].querySelector('.step-status').classList.remove('active');
        steps[i-1].querySelector('.step-status').classList.add('done');
        steps[i-1].querySelector('.step-status').innerHTML = checkSvg;
        steps[i-1].querySelector('.step-text').classList.remove('active');
        steps[i-1].querySelector('.step-text').classList.add('done');
      }
      if (i < steps.length - 3) { // leave last 3 for real API response
        steps[i].querySelector('.step-status').classList.add('active');
        steps[i].querySelector('.step-text').classList.add('active');
        i++;
        setTimeout(animateStep, 500 + Math.random() * 300);
      }
    }
    animateStep();

    try {
      // ── Ensure guest session exists ─────────────────────────────────────────
      try {
        await authAPI.verify();
        // User is logged in — proceed
      } catch (err) {
        if (err.message.includes('401') || err.message.includes('Authentication required') || err.message.includes('Session')) {
          // User is not logged in — create guest session
          try {
            await authAPI.guest();
          } catch (guestErr) {
            throw new Error('Could not start session. Please check your connection and try again.');
          }
        } else {
          // Network error or server error — surface it clearly
          throw new Error('Cannot connect to LawSign server.');
        }
      }

      // ── Upload document to backend ──────────────────────────────────────────
      const docResult = await documentAPI.upload(state.doc);

      // ── Upload all signatures to backend (sequentially) ─────────────────────
      const sigResults = [];
      for (const sigFile of state.sigs) {
        const sigResult = await signatureAPI.upload(sigFile);
        sigResults.push(sigResult);
      }

      // ── Write to shared store ───────────────────────────────────────────────
      store.clear();
      store.setDocumentId(docResult.documentId);
      store.setDocumentName(docResult.originalName);
      store.setMimeType(docResult.mimeType);
      store.setPageCount(docResult.pageCount || 1);
      store.setDetectedFields(docResult.detectedFields || []);

      // Add all signatures to store
      for (const sigResult of sigResults) {
        store.addSignature({
          id: sigResult.signatureId,
          imageUrl: sigResult.imageUrl,
          originalName: sigResult.originalName || 'signature.png',
        });
      }

      // ── Finish last steps animation ─────────────────────────────────────────
      while (i < steps.length) {
        steps[i].querySelector('.step-status').classList.add('active');
        steps[i].querySelector('.step-text').classList.add('active');
        await new Promise(r => setTimeout(r, 400));
        steps[i].querySelector('.step-status').classList.remove('active');
        steps[i].querySelector('.step-status').classList.add('done');
        steps[i].querySelector('.step-status').innerHTML = checkSvg;
        steps[i].querySelector('.step-text').classList.remove('active');
        steps[i].querySelector('.step-text').classList.add('done');
        i++;
      }

      await new Promise(r => setTimeout(r, 500));
      window.location.hash = '#/editor';

    } catch (err) {
      overlay.classList.remove('active');
      // Reset steps
      steps.forEach(s => {
        s.querySelector('.step-status').className = 'step-status';
        s.querySelector('.step-status').innerHTML = '';
        s.querySelector('.step-text').classList.remove('active','done');
      });
      showError(`Upload failed: ${err.message}`);
    }
  });
}
