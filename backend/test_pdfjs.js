const fs = require('fs');

async function test() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const filePath = './test-document.pdf';
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDocument = await loadingTask.promise;
  
  const pageCount = pdfDocument.numPages;
  console.log(`Pages: ${pageCount}`);
  
  for (let i = 1; i <= Math.min(pageCount, 1); i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    for (let j = 0; j < Math.min(textContent.items.length, 5); j++) {
      const item = textContent.items[j];
      console.log(`Text: "${item.str}", X: ${item.transform[4]}, Y: ${item.transform[5]}`);
    }
  }
}

test().catch(console.error);
