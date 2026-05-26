import { documentAPI, outputAPI, authAPI, signatureAPI } from '../utils/api.js';

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
        <div class="dash-nav-item active" data-tab="documents">${navIcon('documents')} Documents</div>
        <div class="dash-nav-item" data-tab="signatures">${navIcon('signatures')} Signatures</div>
        <div class="dash-nav-item" data-tab="billing">${navIcon('billing')} Billing</div>
        <div class="dash-nav-item" data-tab="settings">${navIcon('settings')} Settings</div>
        <div class="dash-nav-item" data-tab="help">${navIcon('help')} Help</div>
      </nav>
      <div class="dash-user">
        <div class="dash-user-avatar" id="dash-user-avatar">--</div>
        <div class="dash-user-info">
          <div class="dash-user-name" id="dash-user-name">Loading...</div>
          <div class="dash-user-plan" id="dash-user-plan"></div>
        </div>
        <a href="#" id="dash-logout" style="color:var(--text-3);" title="Logout">${navIcon('logout')}</a>
      </div>
    </aside>
    <main class="dash-main">
      <div id="tab-documents" class="dash-tab-content" style="display:block;">
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
      </div>

      <div id="tab-signatures" class="dash-tab-content" style="display:none;">
        <div class="dash-header">
          <div>
            <h1>My Signatures</h1>
            <p style="color:var(--text-3);font-size:var(--text-sm);margin-top:4px;">Manage your saved signatures and initials</p>
          </div>
          <a href="#/upload" class="btn btn-primary" style="display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(99, 102, 241, 0.3);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add New Signature
          </a>
        </div>
        
        <!-- Premium Signature Stats -->
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:var(--space-4);margin-top:var(--space-6);margin-bottom:var(--space-8);">
          <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:var(--space-5);display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;border-radius:12px;background:rgba(99,102,241,0.1);color:var(--accent-indigo);display:flex;align-items:center;justify-content:center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19c-4 0-7-1-9-3"/><path d="M3 16c2-3 4-8 7-8s3 3 5 3 3-2 5-2"/></svg>
            </div>
            <div>
              <div style="color:var(--text-3);font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:4px;">Total Saved</div>
              <div style="color:var(--text-1);font-size:1.5rem;font-weight:bold;" id="sig-count-total">-</div>
            </div>
          </div>
          
          <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:var(--space-5);display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;border-radius:12px;background:rgba(34,197,94,0.1);color:#22c55e;display:flex;align-items:center;justify-content:center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div>
              <div style="color:var(--text-3);font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:4px;">Status</div>
              <div style="color:var(--text-1);font-size:1.5rem;font-weight:bold;">Active</div>
            </div>
          </div>
          
          <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:var(--space-5);display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;border-radius:12px;background:rgba(234,179,8,0.1);color:#eab308;display:flex;align-items:center;justify-content:center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <div>
              <div style="color:var(--text-3);font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:4px;">Security</div>
              <div style="color:var(--text-1);font-size:1.5rem;font-weight:bold;">256-bit</div>
            </div>
          </div>
        </div>

        <h2 style="font-size:1.2rem;color:var(--text-1);margin-bottom:var(--space-4);">Signature Gallery</h2>
        <div id="dash-sig-list" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:var(--space-6);">
          <div style="color:var(--text-3);">Loading signatures...</div>
        </div>
      </div>
      
      <div id="tab-billing" class="dash-tab-content" style="display:none;">
        
        <!-- ================= OVERVIEW VIEW ================= -->
        <div id="billing-overview-view">
          <div class="dash-header" style="margin-bottom:var(--space-6);">
            <div>
              <h1>Billing & Subscription</h1>
              <p style="color:var(--text-3);font-size:var(--text-sm);margin-top:4px;">Manage your plans, usage, and payment methods</p>
            </div>
          </div>
          
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:var(--space-6);margin-bottom:var(--space-6);">
            
            <!-- Current Plan Card -->
            <div style="background:linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%);border:1px solid rgba(99, 102, 241, 0.2);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                <h3 style="color:var(--text-1);font-size:1.1rem;">Current Plan</h3>
                <div style="display:inline-block;padding:2px 8px;background:rgba(99,102,241,0.2);color:#818cf8;border-radius:100px;font-size:10px;font-weight:bold;letter-spacing:0.5px;">FREE</div>
              </div>
              <h2 style="font-size:2.5rem;color:var(--text-1);font-weight:bold;margin-bottom:8px;">$0<span style="font-size:1rem;color:var(--text-3);font-weight:normal;">/mo</span></h2>
              <p style="color:var(--text-3);font-size:0.85rem;margin-bottom:var(--space-6);flex-grow:1;">Basic e-signatures for individuals. Includes 50 signatures per month.</p>
              <button class="btn btn-primary btn-full" style="background:var(--accent-indigo);border:none;box-shadow:0 4px 12px rgba(99, 102, 241, 0.3);" onclick="document.getElementById('billing-overview-view').style.display='none'; document.getElementById('billing-upgrade-view').style.display='block';">Upgrade Plan</button>
            </div>

            <!-- Payment Method State -->
            <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-5);">
                <h3 style="color:var(--text-1);font-size:1.1rem;">Payment Method</h3>
              </div>
              
              <!-- Empty State (No Payment Method) -->
              <div style="border:1px dashed var(--border-1);border-radius:12px;padding:24px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:rgba(255,255,255,0.02);flex-grow:1;">
                <div style="width:40px;height:40px;border-radius:50%;background:rgba(99,102,241,0.1);color:var(--accent-indigo);display:flex;align-items:center;justify-content:center;margin-bottom:12px;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                </div>
                <h4 style="color:var(--text-1);font-size:0.95rem;margin-bottom:4px;">No payment method</h4>
                <p style="color:var(--text-3);font-size:0.8rem;margin-bottom:16px;max-width:220px;">Add a credit card to upgrade your plan or avoid service interruption.</p>
                <button class="btn btn-ghost btn-sm" style="border:1px solid var(--border-1);display:flex;align-items:center;gap:6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Add Payment Method
                </button>
              </div>
            </div>

            <!-- Usage Tracker -->
            <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;">
              <h3 style="color:var(--text-1);font-size:1.1rem;margin-bottom:var(--space-5);">Monthly Usage</h3>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="color:var(--text-2);font-weight:500;">Documents Signed</span>
                <span style="color:var(--text-1);font-weight:600;"><span id="usage-docs">0</span> / 50</span>
              </div>
              <div style="width:100%;height:10px;background:var(--surface-3);border-radius:100px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,0.1);">
                <div id="usage-bar" style="width:0%;height:100%;background:linear-gradient(90deg, #3b82f6, var(--accent-indigo));border-radius:100px;transition:width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
              </div>
              <p style="color:var(--text-3);font-size:0.8rem;margin-top:16px;display:flex;align-items:center;gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Your cycle resets in 14 days
              </p>
            </div>
            
          </div>


        </div>

        <!-- ================= UPGRADE VIEW ================= -->
        <div id="billing-upgrade-view" style="display:none;">
          
          <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:var(--space-6);">
            <div>
              <button class="btn btn-ghost btn-sm" style="margin-bottom:12px;padding:0;color:var(--text-3);margin-left:-8px;" onclick="document.getElementById('billing-upgrade-view').style.display='none'; document.getElementById('billing-overview-view').style.display='block';">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Back to overview
              </button>
              <h1 style="font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--text-1);">Upgrade your plan</h1>
              <p style="color:var(--text-3);font-size:var(--text-sm);margin-top:4px;">Choose the plan that best fits your signing needs</p>
            </div>
            
            <div style="display:flex;background:var(--surface-2);border:1px solid var(--border-1);border-radius:100px;padding:4px;">
              <button id="btn-bill-mo" class="btn btn-sm" style="background:var(--surface-1);color:var(--text-1);box-shadow:0 1px 3px rgba(0,0,0,0.1);border-radius:100px;transition:all 0.2s;" onclick="
                document.getElementById('btn-bill-mo').style.background='var(--surface-1)';
                document.getElementById('btn-bill-mo').style.color='var(--text-1)';
                document.getElementById('btn-bill-mo').style.boxShadow='0 1px 3px rgba(0,0,0,0.1)';
                document.getElementById('btn-bill-yr').style.background='transparent';
                document.getElementById('btn-bill-yr').style.color='var(--text-3)';
                document.getElementById('btn-bill-yr').style.boxShadow='none';
                document.getElementById('pricing-grid-mo').style.display='grid';
                document.getElementById('pricing-grid-yr').style.display='none';
              ">Monthly</button>
              
              <button id="btn-bill-yr" class="btn btn-ghost btn-sm" style="color:var(--text-3);border-radius:100px;transition:all 0.2s;" onclick="
                document.getElementById('btn-bill-yr').style.background='var(--surface-1)';
                document.getElementById('btn-bill-yr').style.color='var(--text-1)';
                document.getElementById('btn-bill-yr').style.boxShadow='0 1px 3px rgba(0,0,0,0.1)';
                document.getElementById('btn-bill-mo').style.background='transparent';
                document.getElementById('btn-bill-mo').style.color='var(--text-3)';
                document.getElementById('btn-bill-mo').style.boxShadow='none';
                document.getElementById('pricing-grid-mo').style.display='none';
                document.getElementById('pricing-grid-yr').style.display='grid';
              ">Annual <span style="color:#22c55e;margin-left:4px;font-size:10px;">Save 25%</span></button>
            </div>
          </div>
          
          <!-- MONTHLY PRICING -->
          <div id="pricing-grid-mo" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:var(--space-6);margin-bottom:var(--space-8);">
            
            <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;">
              <h3 style="color:var(--text-1);font-size:1.2rem;margin-bottom:8px;">Free</h3>
              <p style="color:var(--text-3);font-size:0.9rem;margin-bottom:24px;min-height:40px;">For individuals needing basic e-signatures occasionally.</p>
              <div style="margin-bottom:24px;">
                <span style="font-size:2.5rem;font-weight:bold;color:var(--text-1);">$0</span><span style="color:var(--text-3);">/mo</span>
                <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Free forever</div>
              </div>
              <button class="btn btn-ghost btn-full" style="border:1px solid var(--border-1);margin-bottom:32px;" disabled>Current Plan</button>
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;font-size:0.9rem;">
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> 50 documents / month</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Standard Audit Trail</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-3);opacity:0.5;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Custom Branding</li>
              </ul>
            </div>

            <div style="background:var(--surface-1);border:2px solid var(--accent-indigo);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;position:relative;box-shadow:0 10px 30px rgba(99,102,241,0.15);transform:scale(1.02);">
              <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--accent-indigo);color:white;padding:4px 12px;border-radius:100px;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Most Popular</div>
              <h3 style="color:var(--text-1);font-size:1.2rem;margin-bottom:8px;display:flex;align-items:center;gap:8px;">Pro <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent-indigo)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></h3>
              <p style="color:var(--text-3);font-size:0.9rem;margin-bottom:24px;min-height:40px;">For professionals requiring branding and unlimited signing.</p>
              <div style="margin-bottom:24px;">
                <span style="font-size:2.5rem;font-weight:bold;color:var(--text-1);">$12</span><span style="color:var(--text-3);font-size:1rem;font-weight:normal;">/mo</span>
                <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Billed monthly</div>
              </div>
              <button class="btn btn-primary btn-full" style="background:var(--accent-indigo);box-shadow:0 4px 12px rgba(99, 102, 241, 0.4);margin-bottom:32px;border:none;">Upgrade to Pro</button>
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;font-size:0.9rem;">
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-1);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <b>Unlimited</b> documents</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Advanced Audit Trail</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Custom Logo & Branding</li>
              </ul>
            </div>

            <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;">
              <h3 style="color:var(--text-1);font-size:1.2rem;margin-bottom:8px;">Business</h3>
              <p style="color:var(--text-3);font-size:0.9rem;margin-bottom:24px;min-height:40px;">For teams that need API access and dedicated support.</p>
              <div style="margin-bottom:24px;">
                <span style="font-size:2.5rem;font-weight:bold;color:var(--text-1);">$49</span><span style="color:var(--text-3);font-size:1rem;font-weight:normal;">/mo</span>
                <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Billed monthly</div>
              </div>
              <button class="btn btn-ghost btn-full" style="border:1px solid var(--border-1);margin-bottom:32px;">Upgrade to Business</button>
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;font-size:0.9rem;">
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Everything in Pro</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> API Access</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Dedicated Account Manager</li>
              </ul>
            </div>
          </div>
          
          <!-- ANNUAL PRICING -->
          <div id="pricing-grid-yr" style="display:none;grid-template-columns:repeat(3, 1fr);gap:var(--space-6);margin-bottom:var(--space-8);">
            
            <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;">
              <h3 style="color:var(--text-1);font-size:1.2rem;margin-bottom:8px;">Free</h3>
              <p style="color:var(--text-3);font-size:0.9rem;margin-bottom:24px;min-height:40px;">For individuals needing basic e-signatures occasionally.</p>
              <div style="margin-bottom:24px;">
                <span style="font-size:2.5rem;font-weight:bold;color:var(--text-1);">$0</span><span style="color:var(--text-3);">/mo</span>
                <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Free forever</div>
              </div>
              <button class="btn btn-ghost btn-full" style="border:1px solid var(--border-1);margin-bottom:32px;" disabled>Current Plan</button>
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;font-size:0.9rem;">
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> 50 documents / month</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Standard Audit Trail</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-3);opacity:0.5;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Custom Branding</li>
              </ul>
            </div>

            <div style="background:var(--surface-1);border:2px solid var(--accent-indigo);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;position:relative;box-shadow:0 10px 30px rgba(99,102,241,0.15);transform:scale(1.02);">
              <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--accent-indigo);color:white;padding:4px 12px;border-radius:100px;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Most Popular</div>
              <h3 style="color:var(--text-1);font-size:1.2rem;margin-bottom:8px;display:flex;align-items:center;gap:8px;">Pro <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent-indigo)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></h3>
              <p style="color:var(--text-3);font-size:0.9rem;margin-bottom:24px;min-height:40px;">For professionals requiring branding and unlimited signing.</p>
              <div style="margin-bottom:24px;">
                <span style="font-size:2.5rem;font-weight:bold;color:var(--text-1);">$9</span><span style="color:var(--text-3);font-size:1rem;font-weight:normal;">/mo</span>
                <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Billed annually ($108)</div>
              </div>
              <button class="btn btn-primary btn-full" style="background:var(--accent-indigo);box-shadow:0 4px 12px rgba(99, 102, 241, 0.4);margin-bottom:32px;border:none;">Upgrade to Pro</button>
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;font-size:0.9rem;">
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-1);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <b>Unlimited</b> documents</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Advanced Audit Trail</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Custom Logo & Branding</li>
              </ul>
            </div>

            <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;">
              <h3 style="color:var(--text-1);font-size:1.2rem;margin-bottom:8px;">Business</h3>
              <p style="color:var(--text-3);font-size:0.9rem;margin-bottom:24px;min-height:40px;">For teams that need API access and dedicated support.</p>
              <div style="margin-bottom:24px;">
                <span style="font-size:2.5rem;font-weight:bold;color:var(--text-1);">$39</span><span style="color:var(--text-3);font-size:1rem;font-weight:normal;">/mo</span>
                <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Billed annually ($468)</div>
              </div>
              <button class="btn btn-ghost btn-full" style="border:1px solid var(--border-1);margin-bottom:32px;">Upgrade to Business</button>
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;font-size:0.9rem;">
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Everything in Pro</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> API Access</li>
                <li style="display:flex;align-items:center;gap:12px;color:var(--text-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Dedicated Account Manager</li>
              </ul>
            </div>
          </div>
          
        </div>
      </div>
      
      <div id="tab-settings" class="dash-tab-content" style="display:none;">
        <div class="dash-header">
          <div>
            <h1>Account Settings</h1>
            <p style="color:var(--text-3);font-size:var(--text-sm);margin-top:4px;">Manage your profile, security, and preferences</p>
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:250px 1fr;gap:var(--space-8);margin-top:var(--space-6);">
          <!-- Settings Sidebar -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <button id="btn-set-profile" class="btn btn-ghost" style="justify-content:flex-start;background:var(--surface-2);color:var(--text-1);" onclick="
              document.getElementById('btn-set-profile').style.background='var(--surface-2)';
              document.getElementById('btn-set-profile').style.color='var(--text-1)';
              document.getElementById('btn-set-notif').style.background='transparent';
              document.getElementById('btn-set-notif').style.color='var(--text-3)';
              document.getElementById('set-view-profile').style.display='block';
              document.getElementById('set-view-notif').style.display='none';
            ">Profile</button>
            <button id="btn-set-notif" class="btn btn-ghost" style="justify-content:flex-start;color:var(--text-3);" onclick="
              document.getElementById('btn-set-notif').style.background='var(--surface-2)';
              document.getElementById('btn-set-notif').style.color='var(--text-1)';
              document.getElementById('btn-set-profile').style.background='transparent';
              document.getElementById('btn-set-profile').style.color='var(--text-3)';
              document.getElementById('set-view-notif').style.display='block';
              document.getElementById('set-view-profile').style.display='none';
            ">Notifications</button>
          </div>

          <!-- Content Area -->
          <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:var(--space-6);">
            
            <!-- PROFILE VIEW -->
            <div id="set-view-profile" style="display:block;">
              <h2 style="font-size:1.2rem;color:var(--text-1);margin-bottom:24px;border-bottom:1px solid var(--border-1);padding-bottom:16px;">Personal Information</h2>
              
              <div style="display:flex;align-items:center;gap:var(--space-6);margin-bottom:var(--space-8);">
                <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg, var(--accent-indigo), #3b82f6);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.2);" id="settings-avatar">--</div>
                <div>
                  <div style="display:flex;gap:12px;margin-bottom:8px;">
                    <button class="btn btn-primary btn-sm">Upload new picture</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--text-3);">Remove</button>
                  </div>
                  <div style="color:var(--text-3);font-size:0.8rem;">JPG, GIF or PNG. Max size of 800K.</div>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);margin-bottom:var(--space-6);">
                <div>
                  <label style="display:block;color:var(--text-2);margin-bottom:8px;font-size:0.9rem;font-weight:500;">First Name</label>
                  <input type="text" class="input-field" id="settings-fname" placeholder="Yogi" style="width:100%;">
                </div>
                <div>
                  <label style="display:block;color:var(--text-2);margin-bottom:8px;font-size:0.9rem;font-weight:500;">Last Name</label>
                  <input type="text" class="input-field" id="settings-lname" placeholder="Panchal" style="width:100%;">
                </div>
              </div>
              
              <div style="margin-bottom:var(--space-8);">
                <label style="display:block;color:var(--text-2);margin-bottom:8px;font-size:0.9rem;font-weight:500;">Email Address</label>
                <div style="position:relative;">
                  <input type="email" class="input-field" id="settings-email" style="width:100%;padding-left:40px;color:var(--text-3);" readonly>
                  <svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <p style="font-size:0.8rem;color:var(--text-3);margin-top:6px;">Contact support to change your email address.</p>
              </div>

              <h2 style="font-size:1.2rem;color:var(--text-1);margin-bottom:24px;border-bottom:1px solid var(--border-1);padding-bottom:16px;">Preferences</h2>

              <div style="margin-bottom:var(--space-6);">
                <label style="display:block;color:var(--text-2);margin-bottom:8px;font-size:0.9rem;font-weight:500;">Company Name</label>
                <input type="text" class="input-field" placeholder="e.g. Acme Corp" style="width:100%;">
              </div>

              <div style="margin-bottom:var(--space-8);">
                <label style="display:block;color:var(--text-2);margin-bottom:8px;font-size:0.9rem;font-weight:500;">Timezone</label>
                <select class="input-field" style="width:100%;background-color:var(--surface-1);cursor:pointer;">
                  <option>Pacific Time (US & Canada)</option>
                  <option>Eastern Time (US & Canada)</option>
                  <option selected>India Standard Time (IST)</option>
                  <option>Greenwich Mean Time (GMT)</option>
                </select>
              </div>

              <div style="display:flex;justify-content:flex-end;gap:var(--space-3);border-top:1px solid var(--border-1);padding-top:var(--space-6);">
                <button class="btn btn-ghost">Cancel</button>
                <button class="btn btn-primary" onclick="alert('Profile updated successfully!')">Save Changes</button>
              </div>
            </div>

            <!-- NOTIFICATIONS VIEW -->
            <div id="set-view-notif" style="display:none;">
              <h2 style="font-size:1.2rem;color:var(--text-1);margin-bottom:8px;">Email Notifications</h2>
              <p style="color:var(--text-3);font-size:0.9rem;margin-bottom:24px;border-bottom:1px solid var(--border-1);padding-bottom:16px;">Choose what updates you want to receive via email.</p>
              
              <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:32px;">
                <!-- Toggle Item 1 -->
                <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:var(--surface-1);border-radius:var(--radius-md);border:1px solid var(--border-1);">
                  <div>
                    <h4 style="color:var(--text-1);margin-bottom:4px;font-size:1rem;">Document Signed</h4>
                    <p style="color:var(--text-3);font-size:0.85rem;">Get notified instantly when a signer completes a document.</p>
                  </div>
                  <label style="position:relative;display:inline-block;width:44px;height:24px;">
                    <input type="checkbox" checked style="opacity:0;width:0;height:0;" onchange="this.nextElementSibling.style.background = this.checked ? '#22c55e' : 'var(--surface-3)'; this.nextElementSibling.firstElementChild.style.transform = this.checked ? 'translateX(20px)' : 'translateX(0)';">
                    <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#22c55e;transition:.4s;border-radius:24px;">
                      <span style="position:absolute;content:'';height:18px;width:18px;left:3px;bottom:3px;background-color:white;transition:.4s;border-radius:50%;transform:translateX(20px);"></span>
                    </span>
                  </label>
                </div>
                
                <!-- Toggle Item 2 -->
                <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:var(--surface-1);border-radius:var(--radius-md);border:1px solid var(--border-1);">
                  <div>
                    <h4 style="color:var(--text-1);margin-bottom:4px;font-size:1rem;">Weekly Digest</h4>
                    <p style="color:var(--text-3);font-size:0.85rem;">Receive a weekly summary of your document activity and usage.</p>
                  </div>
                  <label style="position:relative;display:inline-block;width:44px;height:24px;">
                    <input type="checkbox" checked style="opacity:0;width:0;height:0;" onchange="this.nextElementSibling.style.background = this.checked ? '#22c55e' : 'var(--surface-3)'; this.nextElementSibling.firstElementChild.style.transform = this.checked ? 'translateX(20px)' : 'translateX(0)';">
                    <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#22c55e;transition:.4s;border-radius:24px;">
                      <span style="position:absolute;content:'';height:18px;width:18px;left:3px;bottom:3px;background-color:white;transition:.4s;border-radius:50%;transform:translateX(20px);"></span>
                    </span>
                  </label>
                </div>

                <!-- Toggle Item 3 -->
                <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:var(--surface-1);border-radius:var(--radius-md);border:1px solid var(--border-1);">
                  <div>
                    <h4 style="color:var(--text-1);margin-bottom:4px;font-size:1rem;">Marketing & Updates</h4>
                    <p style="color:var(--text-3);font-size:0.85rem;">Hear about new features, promotions, and LawSign news.</p>
                  </div>
                  <label style="position:relative;display:inline-block;width:44px;height:24px;">
                    <input type="checkbox" style="opacity:0;width:0;height:0;" onchange="this.nextElementSibling.style.background = this.checked ? '#22c55e' : 'var(--surface-3)'; this.nextElementSibling.firstElementChild.style.transform = this.checked ? 'translateX(20px)' : 'translateX(0)';">
                    <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:var(--surface-3);transition:.4s;border-radius:24px;">
                      <span style="position:absolute;content:'';height:18px;width:18px;left:3px;bottom:3px;background-color:white;transition:.4s;border-radius:50%;transform:translateX(0);"></span>
                    </span>
                  </label>
                </div>
              </div>
              
              <div style="display:flex;justify-content:flex-end;gap:var(--space-3);border-top:1px solid var(--border-1);padding-top:var(--space-6);">
                <button class="btn btn-ghost">Cancel</button>
                <button class="btn btn-primary" onclick="alert('Notification preferences saved!')">Save Preferences</button>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <div id="tab-help" class="dash-tab-content" style="display:none;">
        
        <!-- Premium Hero Section -->
        <div style="background:linear-gradient(135deg, var(--surface-2), rgba(99,102,241,0.08));border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:40px 24px;text-align:center;margin-bottom:32px;position:relative;overflow:hidden;">
          <div style="position:relative;z-index:2;">
            <h1 style="color:var(--text-1);font-size:2rem;margin-bottom:12px;">How can we help you today?</h1>
            <p style="color:var(--text-3);font-size:1rem;margin-bottom:24px;max-width:500px;margin-left:auto;margin-right:auto;">Search our knowledge base or get in touch with our support team.</p>
            <div style="max-width:480px;margin:0 auto;position:relative;">
              <svg style="position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--text-3);" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" class="input-field" placeholder="Search for articles, guides, or FAQs..." style="width:100%;padding-left:48px;padding-top:12px;padding-bottom:12px;border-radius:100px;background:var(--surface-1);border:1px solid var(--border-1);box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            </div>
          </div>
          <!-- Decorative Background Elements -->
          <svg style="position:absolute;top:-20%;right:-5%;width:300px;height:300px;opacity:0.03;color:var(--text-1);" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-8);">
          
          <!-- Contact Options Grid (Left Column) -->
          <div style="display:flex;flex-direction:column;gap:var(--space-6);">
            
            <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid var(--border-1);padding-bottom:12px;margin-bottom:4px;">
              <h3 style="color:var(--text-1);font-size:1.1rem;margin:0;">Contact Options</h3>
            </div>
            
            <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:24px;display:flex;gap:20px;cursor:pointer;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(0,0,0,0.05);" onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='var(--accent-indigo)';this.style.boxShadow='0 8px 24px rgba(99,102,241,0.15)';" onmouseout="this.style.transform='none';this.style.borderColor='var(--border-1)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)';">
              <div style="width:56px;height:56px;background:linear-gradient(135deg, #4f46e5, #6366f1);color:white;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(99,102,241,0.3);">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>
              <div style="display:flex;flex-direction:column;justify-content:center;">
                <h3 style="color:var(--text-1);margin-bottom:6px;font-size:1.1rem;font-weight:600;">Email Support</h3>
                <p style="color:var(--text-3);font-size:0.9rem;line-height:1.4;">Send us a message and we'll reply within 2 hours.</p>
              </div>
            </div>

            <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:24px;display:flex;gap:20px;cursor:pointer;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(0,0,0,0.05);" onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='#22c55e';this.style.boxShadow='0 8px 24px rgba(34,197,94,0.15)';" onmouseout="this.style.transform='none';this.style.borderColor='var(--border-1)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)';">
              <div style="width:56px;height:56px;background:linear-gradient(135deg, #16a34a, #22c55e);color:white;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(34,197,94,0.3);">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              </div>
              <div style="display:flex;flex-direction:column;justify-content:center;">
                <h3 style="color:var(--text-1);margin-bottom:6px;font-size:1.1rem;font-weight:600;">Live Chat</h3>
                <p style="color:var(--text-3);font-size:0.9rem;line-height:1.4;">Chat with our support engineers right now. 24/7 availability.</p>
              </div>
            </div>
            
            <div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--radius-lg);padding:24px;display:flex;gap:20px;cursor:pointer;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(0,0,0,0.05);" onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='#eab308';this.style.boxShadow='0 8px 24px rgba(234,179,8,0.15)';" onmouseout="this.style.transform='none';this.style.borderColor='var(--border-1)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)';">
              <div style="width:56px;height:56px;background:linear-gradient(135deg, #ca8a04, #eab308);color:white;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(234,179,8,0.3);">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              </div>
              <div style="display:flex;flex-direction:column;justify-content:center;">
                <h3 style="color:var(--text-1);margin-bottom:6px;font-size:1.1rem;font-weight:600;">Documentation</h3>
                <p style="color:var(--text-3);font-size:0.9rem;line-height:1.4;">Browse our detailed step-by-step guides and API references.</p>
              </div>
            </div>

          </div>

          <!-- FAQs (Right Column) -->
          <div style="display:flex;flex-direction:column;gap:var(--space-6);">
            
            <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid var(--border-1);padding-bottom:12px;margin-bottom:4px;">
              <h3 style="color:var(--text-1);font-size:1.1rem;margin:0;">Popular FAQs</h3>
              <a href="#" style="color:var(--accent-indigo);font-size:0.85rem;text-decoration:none;">View All</a>
            </div>
            
            <div style="display:flex;flex-direction:column;gap:12px;">
              
              <!-- FAQ Item -->
              <div style="background:var(--surface-1);border:1px solid var(--border-1);border-radius:var(--radius-md);padding:16px;cursor:pointer;transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--accent-indigo)'" onmouseout="this.style.borderColor='var(--border-1)'">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <h4 style="color:var(--text-1);font-weight:500;font-size:0.95rem;margin:0;">Are my documents legally binding?</h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-3);"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <p style="color:var(--text-3);font-size:0.85rem;line-height:1.5;margin:0;">Yes, LawSign complies with the ESIGN Act, UETA, and eIDAS, ensuring your documents have full legal standing globally.</p>
              </div>
              
              <!-- FAQ Item -->
              <div style="background:var(--surface-1);border:1px solid var(--border-1);border-radius:var(--radius-md);padding:16px;cursor:pointer;transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--accent-indigo)'" onmouseout="this.style.borderColor='var(--border-1)'">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <h4 style="color:var(--text-1);font-weight:500;font-size:0.95rem;margin:0;">What happens to my audit trail?</h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-3);"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <p style="color:var(--text-3);font-size:0.85rem;line-height:1.5;margin:0;">Audit trails are permanently hashed using SHA-256 and appended to the final generated PDF as undeniable cryptographic proof.</p>
              </div>
              
              <!-- FAQ Item -->
              <div style="background:var(--surface-1);border:1px solid var(--border-1);border-radius:var(--radius-md);padding:16px;cursor:pointer;transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--accent-indigo)'" onmouseout="this.style.borderColor='var(--border-1)'">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <h4 style="color:var(--text-1);font-weight:500;font-size:0.95rem;margin:0;">How do I change my billing plan?</h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-3);"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <p style="color:var(--text-3);font-size:0.85rem;line-height:1.5;margin:0;">Navigate to the Billing tab in your dashboard, click 'Upgrade Plan', and select your desired tier.</p>
              </div>

              <!-- System Status -->
              <div style="background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.2);border-radius:var(--radius-md);padding:16px;display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="position:relative;width:12px;height:12px;">
                    <div style="position:absolute;width:100%;height:100%;background-color:#22c55e;border-radius:50%;opacity:0.2;"></div>
                    <div style="position:absolute;width:6px;height:6px;top:3px;left:3px;background-color:#22c55e;border-radius:50%;"></div>
                  </div>
                  <div>
                    <h4 style="color:var(--text-1);font-size:0.9rem;margin:0;font-weight:600;">All Systems Operational</h4>
                    <p style="color:var(--text-3);font-size:0.8rem;margin:0;margin-top:2px;">Last updated 2 mins ago</p>
                  </div>
                </div>
                <a href="#" style="color:var(--text-2);font-size:0.85rem;text-decoration:none;">View Status Page</a>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </main>
  </div>`;

  const tbody = app.querySelector('#dash-tbody');
  
  // Logout handler
  app.querySelector('#dash-logout').addEventListener('click', async (e) => {
    e.preventDefault();
    try { await authAPI.logout(); } catch(err){}
    window.location.hash = '#/login';
  });

  try {
    const [resData, authRes] = await Promise.all([
      documentAPI.list(),
      authAPI.verify().catch(() => null) // Ignore auth errors here, handled globally or silently fallback
    ]);
    
    if (authRes && authRes.user) {
      const u = authRes.user;
      app.querySelector('#dash-user-name').textContent = u.name;
      app.querySelector('#dash-user-avatar').textContent = u.name.substring(0, 2).toUpperCase();
      app.querySelector('#dash-user-plan').innerHTML = `<span class="badge badge-default" style="font-size:9px;padding:1px 6px;">${u.plan || 'Free'}</span>`;
      
      const planNameDisplay = app.querySelector('#billing-plan-name-display');
      if (planNameDisplay) planNameDisplay.textContent = u.plan ? (u.plan.charAt(0).toUpperCase() + u.plan.slice(1)) : 'Free';
      
      // Populate Settings tab
      const settingsAvatar = app.querySelector('#settings-avatar');
      if (settingsAvatar) settingsAvatar.textContent = u.name.substring(0, 2).toUpperCase();
      const settingsName = app.querySelector('#settings-name');
      if (settingsName) settingsName.value = u.name;
      const settingsEmail = app.querySelector('#settings-email');
      if (settingsEmail) settingsEmail.value = u.email;
    }

    const docs = resData.documents || resData || [];
    
    app.querySelector('#metric-docs').textContent = docs.length;
    app.querySelector('#metric-sigs').textContent = docs.reduce((acc, d) => acc + (d.placements?.length || 0), 0);
    
    const usageDocs = app.querySelector('#usage-docs');
    if (usageDocs) usageDocs.textContent = docs.length;
    const usageBar = app.querySelector('#usage-bar');
    if (usageBar) {
      setTimeout(() => {
        usageBar.style.width = `${Math.min((docs.length / 50) * 100, 100)}%`;
      }, 500);
    }
    
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
          <td><span class="doc-link" style="cursor:pointer;color:var(--accent-indigo);text-decoration:underline;" data-idx="${i}">${d.originalName}</span></td>
          <td>${dateStr}</td>
          <td class="doc-sigs">${sigs}</td>
          <td>${statusBadge(d.processingStatus)}</td>
          <td class="btn-expand" style="color:var(--text-3);cursor:pointer;font-size:1.2rem;font-weight:bold;">⋯</td>
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
            <button class="btn btn-ghost btn-sm btn-rename" data-id="${d._id}">Rename</button>
            <button class="btn btn-ghost btn-sm btn-delete" data-id="${d._id}" style="color:#ef4444;border-color:#ef4444;">Delete</button>
          </div>
        </div></td></tr>`;
      }).join('');

      app.querySelectorAll('.dash-row').forEach(row => {
        row.addEventListener('click', (e) => {
          const idx = row.dataset.idx;
          
          if (e.target.closest('.btn-expand')) {
            e.stopPropagation();
            const expand = app.querySelector(`#expand-${idx}`);
            expand.classList.toggle('open');
            return;
          }
          
          // Clicked anywhere else on the row -> open editor
          const d = docs[idx];
          import('../utils/store.js').then(async ({ store }) => {
            store.clear();
            store.setDocumentId(d._id);
            store.setDocumentName(d.originalName);
            store.setMimeType(d.mimeType);
            store.setPageCount(d.pageCount || 1);
            store.setDetectedFields(d.detectedFields || []);
            store.setPlacements(d.placements || []);
            
            try {
              const sigRes = await signatureAPI.list();
              if (sigRes && sigRes.signatures && sigRes.signatures.length > 0) {
                store.setSignatureId(sigRes.signatures[0]._id);
                store.setSignatureImageUrl(sigRes.signatures[0].imageUrl);
              }
            } catch (err) { }
            window.location.hash = '#/editor';
          }).catch(err => console.error('Failed to load editor:', err));
        });
      });
      
      app.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = outputAPI.downloadUrl(btn.dataset.id);
          window.open(url, '_blank');
        });
      });
      
      app.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('Are you sure you want to delete this document?')) {
            try {
              await documentAPI.delete(btn.dataset.id);
              renderDashboard(app); // Refresh list
            } catch (err) {
              alert('Failed to delete document: ' + err.message);
            }
          }
        });
      });
      
      app.querySelectorAll('.btn-rename').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const tr = btn.closest('.dash-expand-row').previousElementSibling;
          const d = docs[tr.dataset.idx];
          const newName = prompt('Enter new document name:', d.originalName);
          if (newName && newName.trim() !== '' && newName !== d.originalName) {
            try {
              await documentAPI.rename(btn.dataset.id, newName.trim());
              renderDashboard(app);
            } catch(err) {
              alert('Failed to rename document: ' + err.message);
            }
          }
        });
      });

      // doc-link listener removed as it's now handled by the row itself
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
      
      const tabName = item.dataset.tab;
      if (tabName) {
        app.querySelectorAll('.dash-tab-content').forEach(t => t.style.display = 'none');
        const tgt = app.querySelector(`#tab-${tabName}`);
        if (tgt) tgt.style.display = 'block';
        
        if (tabName === 'signatures') {
          loadSignaturesTab(app);
        }
      }
    });
  });
}

// Global hook for signature deletion to bypass DOM event listener issues
window.deleteSignature = async (id) => {
  if (confirm('Are you sure you want to permanently delete this signature?')) {
    try {
      const { signatureAPI } = await import('../utils/api.js');
      await signatureAPI.delete(id);
      loadSignaturesTab(document.querySelector('#app'));
    } catch (err) {
      alert('Failed to delete signature: ' + err.message);
    }
  }
};

async function loadSignaturesTab(app) {
  const container = app.querySelector('#dash-sig-list');
  if (!container) return;
  try {
    const res = await signatureAPI.list();
    const sigs = res.signatures || [];
    
    // Update metric in header
    const sigCountTotal = app.querySelector('#sig-count-total');
    if (sigCountTotal) sigCountTotal.textContent = sigs.length;
    
    if (sigs.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;background:var(--surface-2);border:1px dashed var(--border-1);border-radius:var(--radius-lg);padding:var(--space-8);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
          <div style="width:64px;height:64px;background:rgba(99,102,241,0.1);color:var(--accent-indigo);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19c-4 0-7-1-9-3"/><path d="M3 16c2-3 4-8 7-8s3 3 5 3 3-2 5-2"/></svg>
          </div>
          <h3 style="color:var(--text-1);font-size:1.2rem;margin-bottom:8px;">No signatures yet</h3>
          <p style="color:var(--text-3);max-width:400px;margin-bottom:24px;">Upload your first signature or initials to securely sign your documents in seconds.</p>
          <a href="#/upload" class="btn btn-primary">Add New Signature</a>
        </div>
      `;
    } else {
      container.innerHTML = sigs.map(s => {
        // Creates a seamless checkered background to beautifully display transparent PNGs
        const checkeredBg = `background-color: #ffffff; background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0), linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0); background-size: 20px 20px; background-position: 0 0, 10px 10px;`;
        
        return `<div class="sig-card" style="background:var(--surface-2);border-radius:var(--radius-lg);border:1px solid var(--border-1);overflow:hidden;transition:all 0.2s ease;box-shadow:0 4px 6px rgba(0,0,0,0.05);" onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='var(--accent-indigo)';" onmouseleave="this.style.transform='none';this.style.borderColor='var(--border-1)';const m=document.getElementById('sig-menu-${s._id}'); if(m) m.style.display='none';">
          
          <div style="height:140px;position:relative;display:flex;align-items:center;justify-content:center;${checkeredBg}border-bottom:1px solid var(--border-1);">
            <img src="${s.imageUrl}" crossorigin="use-credentials" style="max-width:90%;max-height:80%;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
            
            <div style="position:absolute;top:8px;right:8px;cursor:pointer;color:#475569;padding:6px;background:rgba(255,255,255,0.9);border-radius:6px;box-shadow:0 2px 4px rgba(0,0,0,0.1);transition:background 0.2s;" onmouseover="this.style.background='#ffffff'" onmouseout="this.style.background='rgba(255,255,255,0.9)'" onclick="const m=document.getElementById('sig-menu-${s._id}'); document.querySelectorAll('.sig-menu').forEach(x => { if(x!==m) x.style.display='none'; }); if(m) m.style.display = m.style.display === 'block' ? 'none' : 'block';">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </div>
            
            <div class="sig-menu" id="sig-menu-${s._id}" style="display:none;position:absolute;top:40px;right:8px;background:var(--surface-1);border:1px solid var(--border-1);border-radius:var(--radius-md);box-shadow:0 10px 25px rgba(0,0,0,0.3);z-index:10;padding:6px;min-width:120px;">
              <button class="btn btn-ghost btn-sm" onclick="window.deleteSignature('${s._id}')" style="color:#ef4444;width:100%;justify-content:flex-start;padding:8px 12px;font-weight:500;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete
              </button>
            </div>
          </div>

          <div style="padding:16px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="color:var(--text-1);font-weight:600;font-size:0.95rem;margin-bottom:4px;">Signature</div>
              <div style="color:var(--text-3);font-size:0.8rem;display:flex;align-items:center;gap:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Added ${new Date(s.createdAt).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}
              </div>
            </div>
            <div style="background:rgba(99,102,241,0.1);color:var(--accent-indigo);padding:4px 8px;border-radius:100px;font-size:0.75rem;font-weight:bold;">
              READY
            </div>
          </div>
        </div>`;
      }).join('');
    }
  } catch(e) {
    container.innerHTML = `<p style="color:#ef4444;grid-column:1/-1;">Failed to load signatures: ${e.message}</p>`;
  }
}
