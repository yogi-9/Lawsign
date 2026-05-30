/* ============================================================
   store.js — Reactive session state
   ============================================================ */

class AppStore {
  constructor() {
    this._documentId = null;
    this._signatureId = null;
    this._documentName = null;
    this._mimeType = null;
    this._pageCount = 1;
    this._detectedFields = [];
    this._signatureImageUrl = null;
    this._placements = [];
    this._outputDocumentId = null;

    this.restore();
  }

  // Getters
  get documentId() { return this._documentId; }
  get signatureId() { return this._signatureId; }
  get documentName() { return this._documentName; }
  get mimeType() { return this._mimeType; }
  get pageCount() { return this._pageCount; }
  get detectedFields() { return this._detectedFields; }
  get signatureImageUrl() { return this._signatureImageUrl; }
  get placements() { return this._placements; }
  get outputDocumentId() { return this._outputDocumentId; }

  // Computed property used by editor to guard against accessing without uploads
  get isReady() {
    return Boolean(this._documentId && this._signatureId);
  }

  // Setters with Validation
  setDocumentId(id) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error('Invalid documentId: must be a non-empty string');
    }
    this._documentId = id;
    this.persist();
  }

  setSignatureId(id) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error('Invalid signatureId: must be a non-empty string');
    }
    this._signatureId = id;
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

  setSignatureImageUrl(url) {
    if (url !== null && typeof url !== 'string') throw new Error('Invalid signatureImageUrl');
    this._signatureImageUrl = url;
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
        signatureId: this._signatureId,
        documentName: this._documentName,
        mimeType: this._mimeType,
        pageCount: this._pageCount,
        detectedFields: this._detectedFields,
        signatureImageUrl: this._signatureImageUrl,
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
        this._signatureId = data.signatureId || null;
        this._documentName = data.documentName || null;
        this._mimeType = data.mimeType || null;
        this._pageCount = data.pageCount || 1;
        this._detectedFields = data.detectedFields || [];
        this._signatureImageUrl = data.signatureImageUrl || null;
        this._placements = data.placements || [];
        this._outputDocumentId = data.outputDocumentId || null;
      }
    } catch (err) {
      console.error('[store] Failed to restore state:', err);
    }
  }

  clear() {
    this._documentId = null;
    this._signatureId = null;
    this._documentName = null;
    this._mimeType = null;
    this._pageCount = 1;
    this._detectedFields = [];
    this._signatureImageUrl = null;
    this._placements = [];
    this._outputDocumentId = null;
    sessionStorage.removeItem('lawsign_store');
  }
}

export const store = new AppStore();
