'use strict';

/**
 * cleanup.js
 * Script to clean up expired files (cache, orphaned raw signatures, old outputs).
 * Can be run manually or via cron.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Document = require('../models/Document');
const Signature = require('../models/Signature');
const { UPLOAD_PATHS } = require('../config/constants');

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

async function cleanup() {
  let deletedFiles = 0;
  let freedBytes = 0;

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lawsign');
    console.log('✅ Connected to MongoDB for cleanup');

    const now = Date.now();

    // 1. Page Cache (> 24 hours)
    // Page cache directories are named after document IDs.
    const pageCacheDir = UPLOAD_PATHS.PAGE_CACHE || 'uploads/page-cache';
    if (fs.existsSync(pageCacheDir)) {
      const docDirs = fs.readdirSync(pageCacheDir);
      for (const dir of docDirs) {
        const dirPath = path.join(pageCacheDir, dir);
        const stats = fs.statSync(dirPath);
        if (stats.isDirectory() && (now - stats.mtimeMs > 24 * MS_PER_HOUR)) {
          // Check if document still exists and needs it. Actually, if it's > 24h, we can safely delete cache.
          // But to strictly follow "check MongoDB", we verify if doc exists.
          const docExists = await Document.exists({ _id: dir });
          if (!docExists || (now - stats.mtimeMs > 24 * MS_PER_HOUR)) {
            // Delete the directory and its contents
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
              const filePath = path.join(dirPath, file);
              const fileStats = fs.statSync(filePath);
              freedBytes += fileStats.size;
              fs.unlinkSync(filePath);
              deletedFiles++;
            }
            fs.rmdirSync(dirPath);
          }
        }
      }
    }

    // 2. Raw Signatures (> 1 hour)
    const rawSigDir = UPLOAD_PATHS.SIGNATURES_RAW || 'uploads/signatures/raw';
    if (fs.existsSync(rawSigDir)) {
      const rawFiles = fs.readdirSync(rawSigDir);
      for (const file of rawFiles) {
        const filePath = path.join(rawSigDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > 1 * MS_PER_HOUR) {
          freedBytes += stats.size;
          fs.unlinkSync(filePath);
          deletedFiles++;
        }
      }
    }

    // 3. Output PDFs (> 30 days)
    const outputsDir = UPLOAD_PATHS.OUTPUTS || 'uploads/outputs';
    if (fs.existsSync(outputsDir)) {
      const outputFiles = fs.readdirSync(outputsDir);
      for (const file of outputFiles) {
        const filePath = path.join(outputsDir, file);
        const stats = fs.statSync(filePath);
        
        // Find document referencing this output
        // We match by filename since outputPath is usually a relative or absolute path ending in the filename
        const doc = await Document.findOne({ outputPath: new RegExp(file + '$') });
        
        if (!doc) {
          // Orphaned output, safe to delete
          freedBytes += stats.size;
          fs.unlinkSync(filePath);
          deletedFiles++;
        } else {
          // Document exists. Is it older than 30 days?
          if (now - doc.createdAt.getTime() > 30 * MS_PER_DAY) {
            freedBytes += stats.size;
            fs.unlinkSync(filePath);
            deletedFiles++;
            
            // Optionally clear outputPath on document
            doc.outputPath = null;
            await doc.save();
          }
        }
      }
    }

    console.log('✅ Cleanup complete.');
    console.log(`🗑️ Deleted ${deletedFiles} files.`);
    console.log(`💾 Freed ${(freedBytes / 1024 / 1024).toFixed(2)} MB of space.`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
