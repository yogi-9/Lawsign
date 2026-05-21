'use strict';

/**
 * services/storage.service.js
 * File system abstraction layer.
 *
 * All file I/O goes through this service. Swapping from local disk to S3/Cloudinary
 * in Phase 2 means changing ONLY this file — controllers and services are untouched.
 */

const fs   = require('fs');
const path = require('path');

/**
 * Ensure a directory exists, creating it recursively if needed.
 * @param {string} dirPath - Absolute or relative path
 */
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Delete a file from disk.
 * Silently ignores ENOENT (file already gone) — safe to call defensively.
 * @param {string} filePath
 */
const deleteFile = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`[storage] Failed to delete ${filePath}:`, err.message);
    }
  }
};

/**
 * Write a Buffer to disk at the specified path.
 * Creates parent directories if they don't exist.
 * @param {Buffer} buffer
 * @param {string} destination - Full file path including filename
 */
const saveBuffer = (buffer, destination) => {
  ensureDir(path.dirname(destination));
  fs.writeFileSync(destination, buffer);
};

/**
 * Check whether a file exists on disk.
 * @param {string} filePath
 * @returns {boolean}
 */
const fileExists = (filePath) => {
  if (!filePath) return false;
  return fs.existsSync(filePath);
};

/**
 * Create a readable stream for a file (used for streaming downloads).
 * @param {string} filePath
 * @returns {fs.ReadStream}
 */
const getFileStream = (filePath) => fs.createReadStream(filePath);

/**
 * Get file size in bytes.
 * @param {string} filePath
 * @returns {number}
 */
const getFileSize = (filePath) => {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
};

/**
 * Initialize all required upload directories on server startup.
 * Called once from server.js before listening.
 */
const initUploadDirs = () => {
  const dirs = [
    'uploads/documents',
    'uploads/signatures/raw',
    'uploads/signatures/processed',
    'uploads/outputs',
    'uploads/page-cache',
  ];
  dirs.forEach(ensureDir);
  console.log('📁 Upload directories ready.');
};

module.exports = {
  ensureDir,
  deleteFile,
  saveBuffer,
  fileExists,
  getFileStream,
  getFileSize,
  initUploadDirs,
};
