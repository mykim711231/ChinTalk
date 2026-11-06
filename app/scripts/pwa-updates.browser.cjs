// npm run test:pwa (처음에는 npx playwright-core install chromium)
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve(__dirname, '../dist');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(sw.includes('self.skipWaiting()'), '새 워커는 다른 탭 종료를 기다리지 않아야 한다.');
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'data/word-dict.json'), 'utf8'));
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
let version = 0, failInstall = false, swRequests = 0, audioRequests = 0;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const relative = url.pathname.slice('/ChinTalk/'.length) || 'index.html';
  if (!url.pathname.startsWith('/ChinTalk/')) return res.writeHead(404).end();
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(root + path.sep)) return res.writeHead(403).end();
  let content;
  if (relative.startsWith('tts/')) { audioRequests++; return res.writeHead(503).end(); }
  if (relative === 'sw.js') {
    swRequests++;
    content = sw.replace(/(url:"data\/word-dict.json",revision:")[^"]+/, `$1update-test-${version}`);
    // 0: 기존 설치 방식. 2: 대기 중인 예전 워커의 수동 적용도 재현한다.
    if (version === 0 || version === 2) content = content.replace('self.skipWaiting()',
      'self.addEventListener("message",e=>{if(e.data?.type==="SKIP_WAITING")self.skipWaiting()})');
  } else if (relative === 'data/word-dict.json') {
    if (failInstall) return res.writeHead(503).end();
    content = JSON.stringify({ ...dictionary, __pwa_update_test: version });
  } else {
    try { content = fs.readFileSync(absolute); } catch { return res.writeHead(404).end(); }
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(relative)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(content);
});

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/ChinTalk/`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      if (!localStorage.getItem('chintalk-settings')) localStorage.setItem('chintalk-settings', JSON.stringify({
        version: 4, state: { onboarded: true, voiceMode: 'device', autoDownload: true, installDismissedAt: Date.now() },
      }));
    });
    const errors = [];
    const open = async () => {
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}#/settings`);
      await page.getByText('현재 최신 버전을 사용하고 있어요.', { exact: true }).waitFor();
      return page;
    };
    const marker = page => page.evaluate(async () => (await (await fetch('/ChinTalk/data/word-dict.json')).json()).__pwa_update_test);
    const apply = async page => {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.getByRole('button', { name: '새 버전 적용·다시 열기', exact: true }).first().click(),
      ]);
      await page.getByText('현재 최신 버전을 사용하고 있어요.', { exact: true }).waitFor();
    };
    const page = await open();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const other = await open();
    assert.equal(await marker(page), 0);
    await page.evaluate(async () => {
      window.__session = 'active';
      localStorage.setItem('chintalk-progress', JSON.stringify({ version: 0, state: { done: { 'v1-01': true } } }));
      await (await caches.open('chintalk-tts-audio')).put('/ChinTalk/tts/abcdefabcdef.mp3', new Response('saved-audio'));
      await (await caches.open('tts-audio')).put('/SMCB/tts/keep.mp3', new Response('keep-smcb'));
    });
    await other.evaluate(() => { window.__session = 'other-active'; });
    const settings = await page.evaluate(() => localStorage.getItem('chintalk-settings'));
    version = 1;
    await page.getByRole('button', { name: '업데이트 확인', exact: true }).click();
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return !registration.waiting && !registration.installing
        && (await (await fetch('/ChinTalk/data/word-dict.json')).json()).__pwa_update_test === 1;
    });
    assert.equal(await page.evaluate(() => window.__session), 'active');
    assert.equal(await other.evaluate(() => window.__session), 'other-active');
    // 다른 탭을 그대로 둔 채 새 창을 열어도 최신 버전을 사용한다.
    const next = await open();
    assert.equal(await marker(next), 1);
    await next.close();
    await apply(page);
    assert.equal(await page.evaluate(() => window.__session), undefined);
    assert.equal(await other.evaluate(() => window.__session), 'other-active');
    assert.equal(await marker(page), 1);
    assert.equal(await page.evaluate(() => localStorage.getItem('chintalk-settings')), settings);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('chintalk-progress')).state.done['v1-01']), true);
    assert.equal(await page.evaluate(async () => (await (await caches.open('chintalk-tts-audio')).match('/ChinTalk/tts/abcdefabcdef.mp3')).text()), 'saved-audio');
    assert.equal(await page.evaluate(async () => (await (await caches.open('tts-audio')).match('/SMCB/tts/keep.mp3')).text()), 'keep-smcb');
    assert.match(await page.getByText(/현재 앱 버전/).textContent(), /현재 앱 버전 \S+ · \S+/);
    console.log('PASS: existing installation updates with two tabs open; no forced reload; next launch and apply use new data; progress, settings and ChinTalk/SMCB audio survive');

    version = 2;
    const before = swRequests;
    await page.getByRole('button', { name: '업데이트 확인', exact: true }).click();
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration()).waiting);
    assert.ok(swRequests > before, '수동 확인은 60초 제한 없이 실제 업데이트를 요청한다.');
    assert.equal(await marker(page), 1);
    await apply(page);
    assert.equal(await marker(page), 2);
    assert.equal(await other.evaluate(() => window.__session), 'other-active');
    console.log('PASS: manual check bypasses automatic debounce and activates a legacy waiting worker without closing the other tab');

    version = 3; failInstall = true;
    await page.getByRole('button', { name: '업데이트 확인', exact: true }).click();
    await page.getByText('업데이트를 마치지 못했어요. 연결 후 다시 시도해 주세요.', { exact: true }).waitFor();
    assert.equal(await marker(page), 2);
    failInstall = false;
    await page.getByRole('button', { name: '업데이트 확인', exact: true }).click();
    await page.getByRole('button', { name: '새 버전 적용·다시 열기', exact: true }).first().waitFor();
    await apply(page);
    assert.equal(await marker(page), 3);
    console.log('PASS: incomplete update retains usable old data, reports failure and succeeds on retry');

    await context.setOffline(true);
    await page.getByRole('button', { name: '업데이트 확인', exact: true }).click();
    await page.getByText('인터넷 연결 후 업데이트를 확인해 주세요.', { exact: true }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: '설정', exact: true }).waitFor();
    assert.equal(await marker(page), 3);
    assert.equal(audioRequests, 0, '기기 음성 모드는 업데이트 중에도 mp3를 자동으로 받지 않는다.');
    assert.deepEqual(errors, []);
    console.log('PASS: offline update message, offline restart and zero mp3 requests in device mode');
    await context.close();
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
