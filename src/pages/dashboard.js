/* DASHBOARD PAGE */
const DOCS = [
  { name:'rental_agreement_final.pdf', date:'14 May 2026', sigs:5, status:'signed', type:'PDF' },
  { name:'partnership_deed_v2.pdf', date:'12 May 2026', sigs:8, status:'signed', type:'PDF' },
  { name:'sale_deed_mumbai.docx', date:'10 May 2026', sigs:3, status:'signed', type:'DOCX' },
  { name:'affidavit_court_filing.pdf', date:'8 May 2026', sigs:2, status:'signed', type:'PDF' },
  { name:'nda_client_xyz.pdf', date:'5 May 2026', sigs:4, status:'in-progress', type:'PDF' },
];

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

export function renderDashboard(app) {
  const statusBadge = (s) => s === 'signed'
    ? '<span class="badge badge-success">Signed</span>'
    : '<span class="badge badge-warning">In Progress</span>';

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
        <div class="dash-metric-card"><div class="dash-metric-value">24</div><div class="dash-metric-label">Total Documents</div></div>
        <div class="dash-metric-card"><div class="dash-metric-value">87</div><div class="dash-metric-label">Signatures Placed</div></div>
        <div class="dash-metric-card"><div class="dash-metric-value">12 MB</div><div class="dash-metric-label">Storage Used</div></div>
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
        <tbody>
          ${DOCS.map((d,i) => `<tr class="dash-row" data-idx="${i}">
            <td><span class="doc-link">${d.name}</span></td>
            <td>${d.date}</td>
            <td class="doc-sigs">${d.sigs}</td>
            <td>${statusBadge(d.status)}</td>
            <td style="color:var(--text-3);cursor:pointer;">⋯</td>
          </tr>
          <tr class="dash-expand-row"><td colspan="5"><div class="dash-expand" id="expand-${i}">
            <div class="dash-expand-thumb"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
            <div class="dash-expand-details">
              <div><strong>Signed by:</strong> J. Sharma</div>
              <div><strong>Date:</strong> ${d.date} at 10:30 AM IST</div>
              <div><strong>IP:</strong> 103.xx.xx.xx</div>
              <div><strong>Audit:</strong> ${d.sigs} signatures, all verified</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);">
              <button class="btn btn-primary btn-sm">Download</button>
              <button class="btn btn-ghost btn-sm">Rename</button>
            </div>
          </div></td></tr>`).join('')}
        </tbody>
      </table>
    </main>
  </div>`;

  // Expand rows
  app.querySelectorAll('.dash-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx = row.dataset.idx;
      const expand = app.querySelector(`#expand-${idx}`);
      expand.classList.toggle('open');
    });
  });

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
