'use strict';

const fs = require('fs');
const sharp = require('sharp');
const { sendError } = require('../utils/response');

const validateImageIntelligence = async (req, res, next) => {
  if (!req.file) return next();

  // Only validate image formats.
  if (!req.file.mimetype.startsWith('image/')) {
    return next();
  }

  const filePath = req.file.path;
  const isSignature = req.originalUrl.includes('/signatures/');

  // If NVIDIA API Key is missing, skip AI validation (fail open so uploads still work locally)
  if (!process.env.NVIDIA_API_KEY) {
    return next();
  }

  try {
    // 1. Optimize payload: Downscale the image to max 1024x1024 and convert to Base64
    // This saves bandwidth, speeds up the API call, and saves API credits.
    const imageBuffer = await sharp(filePath)
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // 2. Call NVIDIA Vision API
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: 'meta/llama-3.2-11b-vision-instruct',
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are a strict security validator. Look at the attached image. Classify it into EXACTLY ONE of these three categories:\n1. 'SCREENSHOT': A digital screenshot of a computer screen, an app, or a website.\n2. 'DOCUMENT': A photograph or scan of a dense paper document (like a contract, lease, or ID card).\n3. 'SIGNATURE': A photograph of a simple handwritten signature (just ink on blank paper).\nReply with ONLY the single categorical word."
              },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
        max_tokens: 16,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.error(`[NVIDIA API] Request failed with status ${response.status}`);
      return next(); // Fail open if API goes down
    }

    const data = await response.json();
    const classification = data.choices[0].message.content.trim().toUpperCase();

    // 3. Enforce Logic based on classification
    if (classification.includes('SCREENSHOT')) {
      fs.unlinkSync(filePath);
      return sendError(res, 400, 'Image validation failed: This appears to be a digital screenshot. Please upload a real camera photo or scan.');
    }

    if (isSignature && !classification.includes('SIGNATURE')) {
      fs.unlinkSync(filePath);
      return sendError(res, 400, 'Image validation failed: Please upload a clear photo of just your handwritten signature, not a full document or screenshot.');
    }

    next();
  } catch (err) {
    console.error('[NVIDIA API Error]:', err);
    // If we fail for any reason (network timeout, rate limit), we let it pass so users aren't blocked from uploading.
    next();
  }
};

module.exports = validateImageIntelligence;
