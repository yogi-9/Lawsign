/* ============================================================
   api.js — All backend communication lives here.
   Base URL reads from Vite env or falls back to /api/v1
   ============================================================ */

const BASE = import.meta.env.VITE_API_URL || '/api/v1';

class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

// Interceptor wrapper
const _req = async (method, path, body, isFormData = false, retries = 1) => {
  const url = `${BASE}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  const opts = {
    method,
    credentials: 'include', // send/receive cookies (JWT)
    signal: controller.signal
  };

  if (body) {
    if (isFormData) {
      opts.body = body; // FormData — don't set Content-Type, browser sets boundary
    } else {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
  }

  try {
    const res = await fetch(url, opts);
    clearTimeout(timeoutId);

    // Parse JSON
    let data;
    try {
      data = await res.json();
    } catch (e) {
      // If we cannot parse JSON, it might be a generic 502/503 from proxy
      if (res.status >= 500 && retries > 0) {
        console.warn(`[api] ${res.status} error on ${path}, retrying...`);
        await new Promise(r => setTimeout(r, 1000));
        return _req(method, path, body, isFormData, retries - 1);
      }
      throw new APIError(`Invalid JSON response from server (${res.status})`, res.status);
    }

    if (!res.ok || !data.success) {
      // 401 Interceptor
      if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/register') && !path.includes('/auth/verify')) {
        // Redirect to login if not already on auth endpoints or verifying session
        window.location.hash = '#/login';
      }
      
      // 5xx Retry logic
      if (res.status >= 500 && retries > 0) {
        console.warn(`[api] ${res.status} error on ${path}, retrying...`);
        await new Promise(r => setTimeout(r, 1000));
        return _req(method, path, body, isFormData, retries - 1);
      }
      
      throw new APIError(data.error || data.message || 'Request failed', res.status);
    }

    return data.data;

  } catch (err) {
    clearTimeout(timeoutId);
    
    if (err.name === 'AbortError') {
      throw new APIError('Request timed out after 30 seconds', 408);
    }
    
    // If it's a network error (TypeError: Failed to fetch)
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      // Retry once for network errors too just in case it's a momentary blip
      if (retries > 0) {
        console.warn(`[api] Network error on ${path}, retrying...`);
        await new Promise(r => setTimeout(r, 1000));
        return _req(method, path, body, isFormData, retries - 1);
      }
      throw new APIError('Network error. Please check your connection.', 0);
    }
    
    throw err;
  }
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register : (name, email, password, plan) => _req('POST', '/auth/register', { name, email, password, plan }),
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
  // Note: For security hardening, this will be changed to generate signed URLs later
  imageUrl: (id) => `${BASE}/signatures/${id}/image`,
};

// ── Output ────────────────────────────────────────────────────────────────────
export const outputAPI = {
  generate   : (documentId, signatureId, placements) =>
    _req('POST', '/output/generate', { documentId, signatureId, placements }),
  downloadUrl: (documentId) => `${BASE}/output/download/${documentId}`,
  status     : (documentId) => _req('GET', `/output/status/${documentId}`),
};
