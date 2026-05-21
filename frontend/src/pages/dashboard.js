import { documentAPI, outputAPI } from '../utils/api.js';

/* DASHBOARD PAGE */
const navIcon = (name) => {
  const icons = {
    documents: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    signatures: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19c-4 0-7-1-9-3M3 16c2-3 4-8 7-8s3 3 5 3 3-2 5-2"/></svg>',
    billing: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    help: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
  };
  return icons[name] || '';
};

export async function renderDashboard(app) {
  const statusBadge = (s) => s === 'signed'
    ? '<span class="badge badge-success">Signed</span>'
    : '<span class="badge badge-warning">In Progress</span>';

  const skeletonHtml = Array(3).fill(0).map(() => `<tr class="dash-row" style="pointer-events:none;">
    <td><div class="shimmer-bar" style="width:70%;height:16px;border-radius:4px;display:inline-block"></div></td>
    <td><div class="shimmer-bar" style="width:50%;height:16px;border-radius:4px;display:inline-block"></div></td>
    <td><div class="shimmer-bar" style="width:30%;height:16px;border-radius:4px;display:inline-block"></div></td>
    <td><div class="shimmer-bar" style="width:60%;height:16px;border-radius:4px;display:inline-block"></div></td>
    <td></td>
  </tr>`).join('');

  app.innerHTML = `<div class="dash-layout">
    <aside class="dash-sidebar">
      <a href="#/" class="dash-logo">LawSign</a>
      <nav class="dash-nav">
        <div class="dash-nav-item active">${navIcon('documents')} Documents</div>
        <div class="dash-nav-item">${navIcon('signatures')} Signatures</div>
        <div class="dash-nav-item">${navIcon('billing')} Billing</div>
        <div class="dash-nav-item">${navIcon('settings')} Settings</div>
        <div class="dash-nav-item">${navIcon('help')} Help</div>
      </nav>
      <div class="dash-user">
        <div class="dash-user-avatar">JS</div>
        <div class="dash-user-info">
          <div class="dash-user-name">J. Sharma</div>
          <div class="dash-user-plan"><span class="badge badge-default" style="font-size:9px;padding:1px 6px;">Solo Lawyer</span></div>
        </div>
        <a href="#/" style="color:var(--text-3);">${navIcon('logout')}</a>
      </div>
    </aside>
    <main class="dash-main">
      <div class="dash-header"><h1>Documents</h1></div>
      <div class="dash-metrics">
        <div class="dash-metric-card"><div class="dash-metric-value" id="metric-docs">-</div><div class="dash-metric-label">Total Documents</div></div>
        <div class="dash-metric-card"><div class="dash-metric-value" id="metric-sigs">-</div><div class="dash-metric-label">Signatures Placed</div></div>
        <div class="dash-metric-card"><div class="dash-metric-value">-</div><div class="dash-metric-label">Storage Used</div></div>
      </div>
      <div class="dash-filters">
        <div class="dash-search"><input class="input-field" placeholder="Search documents..." style="width:100%;"></div>
        <div class="chip active">All</div>
        <div class="chip">In Progress</div>
        <div class="chip">Signed</div>
        <div class="chip">Expired</div>
      </div>
      <table class="dash-table">
        <thead>
          <tr><th>Document</th><th>Date</th><th>Signatures</th><th>Status</th><th></th></tr>
        </thead>
        <tbody id="dash-tbody">
          ${skeletonHtml}
        </tbody>
      </table>
    </main>
  </div>`;

  const tbody = app.querySelector('#dash-tbody');
  
  try {
    const docs = await documentAPI.list();
    
    app.querySelector('#metric-docs').textContent = docs.length;
    app.querySelector('#metric-sigs').textContent = docs.reduce((acc, d) => acc + (d.placements?.length || 0), 0);
    
    if (docs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-3);">
        <p style="margin-bottom: 12px;">No documents yet.</p>
        <a href="#/upload" class="btn btn-primary btn-sm">Upload your first document</a>
      </td></tr>`;
    } else {
      tbody.innerHTML = docs.map((d, i) => {
        const dateStr = new Date(d.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
        const sigs = d.placements?.length || 0;
        return `<tr class="dash-row" data-idx="${i}">
          <td><span class="doc-link">${d.originalName}</span></td>
          <td>${dateStr}</td>
          <td class="doc-sigs">${sigs}</td>
          <td>${statusBadge(d.processingStatus)}</td>
          <td style="color:var(--text-3);cursor:pointer;">⋯</td>
        </tr>
        <tr class="dash-expand-row"><td colspan="5"><div class="dash-expand" id="expand-${i}">
          <div class="dash-expand-thumb"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div class="dash-expand-details">
            <div><strong>Signed by:</strong> You</div>
            <div><strong>Date:</strong> ${dateStr}</div>
            <div><strong>Audit:</strong> ${sigs} signatures</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--space-2);">
            <button class="btn btn-primary btn-sm btn-download" data-id="${d._id}">Download</button>
            <button class="btn btn-ghost btn-sm">Rename</button>
          </div>
        </div></td></tr>`;
      }).join('');

      app.querySelectorAll('.dash-row').forEach(row => {
        row.addEventListener('click', () => {
          const idx = row.dataset.idx;
          const expand = app.querySelector(`#expand-${idx}`);
          expand.classList.toggle('open');
        });
      });
      
      app.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = outputAPI.downloadUrl(btn.dataset.id);
          window.open(url, '_blank');
        });
      });
    }

  } catch (err) {
    if (err.message.includes('401') || err.message.includes('Authentication')) {
      window.location.hash = '#/login';
      return;
    }
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#ef4444;">
      <p>Failed to load documents: ${err.message}</p>
      <button class="btn btn-primary btn-sm" style="margin-top:12px;" id="dash-retry">Retry</button>
    </td></tr>`;
    const retryBtn = app.querySelector('#dash-retry');
    if (retryBtn) retryBtn.addEventListener('click', () => renderDashboard(app));
  }

  // Filter chips
  app.querySelectorAll('.dash-filters .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      app.querySelectorAll('.dash-filters .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Nav items
  app.querySelectorAll('.dash-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      app.querySelectorAll('.dash-nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });
}
