const Tesseract = require('tesseract.js');
async function test() {
  const filePath = 'C:\\Users\\YOGI PANCHAL\\OneDrive\\Desktop\\Lawsign\\backend\\uploads\\documents\\0a5be260-9704-45cc-8f2b-66100c33b684.png';
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: m => {}
  });
  const { data } = await worker.recognize(filePath, { }, { lines: true, text: true });
  console.log('Lines?', data.lines?.length);
  if (data.lines?.length) {
    console.log(data.lines[0].text, data.lines[0].bbox);
  }
  await worker.terminate();
}
test();
