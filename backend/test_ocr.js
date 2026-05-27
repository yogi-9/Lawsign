const { detectSignatureFields } = require('./services/ocr.service');

async function run() {
  try {
    const fields = await detectSignatureFields('./test-document.pdf', 'application/pdf');
    console.log('Detected fields:', fields);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
