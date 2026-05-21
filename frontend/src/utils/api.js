/* ============================================================
   api.js — All backend communication lives here.
   Base URL reads from Vite env or falls back to localhost:5000
   ============================================================ */

const BASE = 'http://localhost:5000/api/v1';

const _req = async (method, path, body, isFormData = false) => {
  const opts = {
    method,
    credentials: 'include', // send/receive cookies (JWT)
  };
  if (body) {
    if (isFormData) {
      opts.body = body; // FormData — don't set Content-Type, browser sets boundary
    } else {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Request failed');
  return data.data;
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register : (name, email, password) => _req('POST', '/auth/register', { name, email, password }),
  login    : (email, password)       => _req('POST', '/auth/login',    { email, password }),
  verify   : ()                      => _req('GET',  '/auth/verify'),
  logout   : ()                      => _req('POST', '/auth/logout'),
  guest    : ()                      => _req('POST', '/auth/guest'),
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentAPI = {
  upload: (file) => {
    const fd = new FormData();
    fd.append('document', file);
    return _req('POST', '/documents/upload', fd, true);
  },
  get          : (id)              => _req('GET',  `/documents/${id}`),
  list         : ()                => _req('GET',  '/documents/'),
  savePlacements: (id, placements) => _req('PUT',  `/documents/${id}/placements`, { placements }),
  delete       : (id)              => _req('DELETE',`/documents/${id}`),
  // URL for <img src="..."> — serves document page as image (with cookies)
  pageImageUrl : (id, page) => `${BASE}/documents/${id}/page/${page}`,
};

// ── Signatures ────────────────────────────────────────────────────────────────
export const signatureAPI = {
  upload: (file) => {
    const fd = new FormData();
    fd.append('signature', file);
    return _req('POST', '/signatures/upload', fd, true);
  },
  list  : () => _req('GET', '/signatures/'),
  // Image URL for <img src="..."> — served directly by backend
  imageUrl: (id) => `${BASE}/signatures/${id}/image`,
};

// ── Output ────────────────────────────────────────────────────────────────────
export const outputAPI = {
  generate   : (documentId, signatureId, placements) =>
    _req('POST', '/output/generate', { documentId, signatureId, placements }),
  downloadUrl: (documentId) => `${BASE}/output/download/${documentId}`,
  status     : (documentId) => _req('GET', `/output/status/${documentId}`),
};
