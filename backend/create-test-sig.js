const sharp = require('sharp');

async function go() {
  const svg = `<svg width="300" height="100">
    <text x="30" y="65" font-size="40" font-family="cursive" fill="#1a1a2e">John Doe</text>
  </svg>`;

  const buf = await sharp({
    create: {
      width: 300,
      height: 100,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();

  require('fs').writeFileSync('test-signature.png', buf);
  console.log('Created test-signature.png');
}

go();
