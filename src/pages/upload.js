import { createNavbar } from '../components/navbar.js';

const checkSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`;

const STEPS = [
  'Validating document format',
  'Reading document structure',
  'Converting pages to high resolution',
  'Analyzing text layout',
  'Detecting signature zones',
  'Processing signature image',
  'Removing background',
  'Ready'
];

export function renderUpload(app) {
  app.innerHTML = '';
  app.appendChild(createNavbar());

  const state = { doc: null, sig: null };

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
        <div class="upload-zone" id="zone-sig">
          <div class="upload-zone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 19c-4 0-7-1-9-3"/><path d="M3 16c2-3 4-8 7-8s3 3 5 3 3-2 5-2"/><path d="M20 9v0"/></svg>
          </div>
          <div class="upload-zone-primary">Drop your signature photo here</div>
          <div class="upload-zone-secondary">A clear photo of your signature on white paper</div>
          <div class="upload-zone-hint">Tip: photograph on white paper in good lighting for best results</div>
          <input type="file" id="input-sig" accept=".jpg,.jpeg,.png,.webp" style="display:none">
        </div>
      </div>

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

  // Wire up zones
  ['doc', 'sig'].forEach(type => {
    const zone = main.querySelector(`#zone-${type}`);
    const input = main.querySelector(`#input-${type}`);

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0], type); });
    input.addEventListener('change', e => { if(e.target.files[0]) handleFile(e.target.files[0], type); });
  });

  function handleFile(file, type) {
    if (!file) return;
    state[type] = file;
    const zone = main.querySelector(`#zone-${type}`);
    zone.classList.add('has-file');

    const isImage = file.type.startsWith('image');
    let preview = '';
    if (isImage) {
      const url = URL.createObjectURL(file);
      preview = `<img src="${url}" alt="Preview">`;
    } else {
      preview = `<div style="width:80px;height:100px;background:white;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>`;
    }

    zone.innerHTML = `<div class="upload-file-preview">
      ${preview}
      <div class="upload-file-name">${file.name}</div>
      <div class="upload-file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
      <button class="upload-file-remove" data-type="${type}">× Remove</button>
    </div>`;

    zone.querySelector('.upload-file-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      state[type] = null;
      zone.classList.remove('has-file');
      resetZone(zone, type);
      updateProceed();
    });

    updateProceed();
  }

  function resetZone(zone, type) {
    const isDoc = type === 'doc';
    zone.innerHTML = `
      <div class="upload-zone-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${isDoc ? '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' : '<path d="M12 19c-4 0-7-1-9-3"/><path d="M3 16c2-3 4-8 7-8s3 3 5 3 3-2 5-2"/>'}</svg>
      </div>
      <div class="upload-zone-primary">${isDoc ? 'Drop your document here' : 'Drop your signature photo here'}</div>
      <div class="upload-zone-secondary">${isDoc ? 'PDF, DOCX, JPG, PNG — up to 50MB' : 'A clear photo of your signature on white paper'}</div>
    `;
  }

  function updateProceed() {
    const btn = main.querySelector('#btn-proceed');
    if (state.doc && state.sig) {
      btn.disabled = false;
      btn.classList.remove('disabled');
    } else {
      btn.disabled = true;
      btn.classList.add('disabled');
    }
  }

  main.querySelector('#btn-proceed').addEventListener('click', () => {
    if (!state.doc || !state.sig) return;
    runProcessing();
  });

  function runProcessing() {
    const overlay = main.querySelector('#processing-overlay');
    overlay.classList.add('active');
    const steps = overlay.querySelectorAll('.processing-step');
    let i = 0;

    function nextStep() {
      if (i > 0) {
        steps[i-1].querySelector('.step-status').classList.remove('active');
        steps[i-1].querySelector('.step-status').classList.add('done');
        steps[i-1].querySelector('.step-status').innerHTML = checkSvg;
        steps[i-1].querySelector('.step-text').classList.remove('active');
        steps[i-1].querySelector('.step-text').classList.add('done');
      }
      if (i < steps.length) {
        steps[i].querySelector('.step-status').classList.add('active');
        steps[i].querySelector('.step-text').classList.add('active');
        i++;
        setTimeout(nextStep, 600 + Math.random() * 400);
      } else {
        setTimeout(() => {
          window.location.hash = '#/editor';
        }, 800);
      }
    }
    setTimeout(nextStep, 400);
  }
}
