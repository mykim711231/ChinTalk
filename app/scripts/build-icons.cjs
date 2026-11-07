// 기존 SVG를 PNG로 변환한다. 생성한 파일을 커밋하므로 일반 빌드에는 브라우저가 필요 없다.
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const directory = path.resolve(__dirname, '../public/icons');
  const svg = fs.readFileSync(path.join(directory, 'icon.svg'), 'utf8');
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  try {
    const page = await browser.newPage();
    for (const [file, size, scale] of [['icon-192.png', 192, 1], ['icon-512.png', 512, 1], ['icon-maskable-512.png', 512, 0.7]]) {
      const data = await page.evaluate(async ({ svg, size, scale }) => {
        const image = new Image();
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d');
        context.fillStyle = '#0f766e';
        context.fillRect(0, 0, size, size);
        const inset = size * (1 - scale) / 2;
        context.drawImage(image, inset, inset, size * scale, size * scale);
        return canvas.toDataURL('image/png').split(',')[1];
      }, { svg, size, scale });
      fs.writeFileSync(path.join(directory, file), Buffer.from(data, 'base64'));
      console.log(`${file}: ${size}x${size}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
