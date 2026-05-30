/* ============================================================
   store.js — Reactive session state
   ============================================================ */

class AppStore {
  constructor() {
    this._documentId = null;
    this._signatures = []; // Array of { id, imageUrl, originalName }
    this._documentName = null;
    this._mimeType = null;
    this._pageCount = 1;
    this._detectedFields = [];
    this._placements = [];
    this._outputDocumentId = null;

    this.restore();
  }

  // Getters
  get documentId() { return this._documentId; }
  get signatures() { return this._signatures; }
  get documentName() { return this._documentName; }
  get mimeType() { return this._mimeType; }
  get pageCount() { return this._pageCount; }
  get detectedFields() { return this._detectedFields; }
  get placements() { return this._placements; }
  get outputDocumentId() { return this._outputDocumentId; }

  // Backward-compatible getters (return first signature's data)
  get signatureId() { return this._signatures.length > 0 ? this._signatures[0].id : null; }
  get signatureImageUrl() { return this._signatures.length > 0 ? this._signatures[0].imageUrl : null; }

  // Computed property used by editor to guard against accessing without uploads
  get isReady() {
    return Boolean(this._documentId && this._signatures.length > 0);
  }

  // Setters with Validation
  setDocumentId(id) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error('Invalid documentId: must be a non-empty string');
    }
    this._documentId = id;
    this.persist();
  }

  // ── Multi-signature methods ─────────────────────────────────────────────────
  addSignature(sig) {
    if (!sig || typeof sig.id !== 'string' || !sig.imageUrl) {
      throw new Error('Invalid signature: must have id and imageUrl');
    }
    // Avoid duplicates
    if (this._signatures.find(s => s.id === sig.id)) return;
    this._signatures.push({
      id: sig.id,
      imageUrl: sig.imageUrl,
      originalName: sig.originalName || 'signature.png',
    });
    this.persist();
  }

  removeSignature(id) {
    this._signatures = this._signatures.filter(s => s.id !== id);
    this.persist();
  }

  getSignatures() {
    return [...this._signatures];
  }

  clearSignatures() {
    this._signatures = [];
    this.persist();
  }

  // Backward-compatible setter (adds as first/only signature)
  setSignatureId(id) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error('Invalid signatureId: must be a non-empty string');
    }
    // Only used by legacy code path — store temporarily, imageUrl set separately
    if (!this._signatures.find(s => s.id === id)) {
      this._signatures.push({ id, imageUrl: null, originalName: 'signature.png' });
    }
    this.persist();
  }

  setSignatureImageUrl(url) {
    if (url !== null && typeof url !== 'string') throw new Error('Invalid signatureImageUrl');
    // Update the first signature's imageUrl (backward compat)
    if (this._signatures.length > 0) {
      this._signatures[0].imageUrl = url;
    }
    this.persist();
  }

  setDocumentName(name) {
    if (typeof name !== 'string') throw new Error('Invalid documentName');
    this._documentName = name;
    this.persist();
  }

  setMimeType(type) {
    if (typeof type !== 'string') throw new Error('Invalid mimeType');
    this._mimeType = type;
    this.persist();
  }

  setPageCount(count) {
    const num = Number(count);
    if (!Number.isInteger(num) || num < 1) {
      throw new Error('Invalid pageCount: must be a positive integer');
    }
    this._pageCount = num;
    this.persist();
  }

  setDetectedFields(fields) {
    if (!Array.isArray(fields)) throw new Error('Invalid detectedFields: must be an array');
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (typeof f.page !== 'number') throw new Error(`Field ${i}: page must be a number`);
      const hasPercentage = typeof f.xPct === 'number' && typeof f.yPct === 'number';
      const hasAbsolute = typeof f.x === 'number' && typeof f.y === 'number';
      if (!hasPercentage && !hasAbsolute) {
        throw new Error(`Field ${i}: must have either (xPct,yPct) or (x,y) coordinates`);
      }
    }
    this._detectedFields = fields;
    this.persist();
  }

  setPlacements(placements) {
    if (!Array.isArray(placements)) throw new Error('Invalid placements array');
    this._placements = placements;
    this.persist();
  }

  setOutputDocumentId(id) {
    this._outputDocumentId = id;
    this.persist();
  }

  // State Management
  persist() {
    try {
      const data = {
        documentId: this._documentId,
        signatures: this._signatures,
        documentName: this._documentName,
        mimeType: this._mimeType,
        pageCount: this._pageCount,
        detectedFields: this._detectedFields,
        placements: this._placements,
        outputDocumentId: this._outputDocumentId,
      };
      sessionStorage.setItem('lawsign_store', JSON.stringify(data));
    } catch (err) {
      console.error('[store] Failed to persist state:', err);
    }
  }

  restore() {
    try {
      const raw = sessionStorage.getItem('lawsign_store');
      if (raw) {
        const data = JSON.parse(raw);
        this._documentId = data.documentId || null;
        this._documentName = data.documentName || null;
        this._mimeType = data.mimeType || null;
        this._pageCount = data.pageCount || 1;
        this._detectedFields = data.detectedFields || [];
        this._placements = data.placements || [];
        this._outputDocumentId = data.outputDocumentId || null;

        // Restore signatures array (or migrate from old format)
        if (Array.isArray(data.signatures)) {
          this._signatures = data.signatures;
        } else if (data.signatureId) {
          // Migrate old single-signature format
          this._signatures = [{
            id: data.signatureId,
            imageUrl: data.signatureImageUrl || null,
            originalName: 'signature.png',
          }];
        } else {
          this._signatures = [];
        }
      }
    } catch (err) {
      console.error('[store] Failed to restore state:', err);
    }
  }

  clear() {
    this._documentId = null;
    this._signatures = [];
    this._documentName = null;
    this._mimeType = null;
    this._pageCount = 1;
    this._detectedFields = [];
    this._placements = [];
    this._outputDocumentId = null;
    sessionStorage.removeItem('lawsign_store');
  }
}

export const store = new AppStore();
