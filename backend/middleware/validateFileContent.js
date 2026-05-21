'use strict';

/**
 * middleware/validateFileContent.js
 * Validates the actual magic bytes of an uploaded file after Multer saves it.
 * Rejects and deletes the file if it does not match the expected formats.
 */

const fs = require('fs');
const { sendError } = require('../utils/response');

const MAGIC_BYTES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  jpeg: [0xFF, 0xD8, 0xFF],
  tiff_le: [0x49, 0x49, 0x2A, 0x00],
  tiff_be: [0x4D, 0x4D, 0x00, 0x2A],
  docx: [0x50, 0x4B, 0x03, 0x04], // ZIP
  doc: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLECF
};

const checkMagic = (buffer, magicArray) => {
  if (buffer.length < magicArray.length) return false;
  for (let i = 0; i < magicArray.length; i++) {
    if (buffer[i] !== magicArray[i]) return false;
  }
  return true;
};

const validateFileContent = async (req, res, next) => {
  if (!req.file) return next();

  const filePath = req.file.path;
  let fileHandle;

  try {
    // Read the first 8 bytes
    fileHandle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(8);
    await fileHandle.read(buffer, 0, 8, 0);
    await fileHandle.close();
    fileHandle = null;

    let isValid = false;

    // We allow PDF, PNG, JPEG, TIFF, DOCX, DOC
    if (checkMagic(buffer, MAGIC_BYTES.pdf)) isValid = true;
    else if (checkMagic(buffer, MAGIC_BYTES.png)) isValid = true;
    else if (checkMagic(buffer, MAGIC_BYTES.jpeg)) isValid = true;
    else if (checkMagic(buffer, MAGIC_BYTES.tiff_le)) isValid = true;
    else if (checkMagic(buffer, MAGIC_BYTES.tiff_be)) isValid = true;
    else if (checkMagic(buffer, MAGIC_BYTES.docx)) isValid = true;
    else if (checkMagic(buffer, MAGIC_BYTES.doc)) isValid = true;

    if (!isValid) {
      // Content mismatch
      fs.unlinkSync(filePath);
      return sendError(res, 400, 'Invalid file content. The file type does not match its contents.');
    }

    next();
  } catch (err) {
    if (fileHandle) await fileHandle.close().catch(() => {});
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return next(err);
  }
};

module.exports = validateFileContent;
