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
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.start_url, '/ChinTalk/');
assert.equal(manifest.id, '/ChinTalk/');
assert.equal(manifest.scope, '/ChinTalk/');
assert.ok(!fs.readFileSync(path.join(root, 'browser.html'), 'utf8').includes('rel="manifest"'));
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
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
      assert.equal(page.url(), base, '업데이트 후 설정 화면이 아닌 설치 시작 주소에서 시작한다.');
      await page.getByRole('link', { name: '설정', exact: true }).last().click();
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

    const beforeCheckUrl = page.url();
    await page.getByRole('button', { name: '업데이트 확인', exact: true }).click();
    await page.getByText('현재 최신 버전을 사용하고 있어요.', { exact: true }).waitFor();
    assert.equal(page.url(), beforeCheckUrl, '업데이트 확인만으로 다른 화면으로 이동하지 않는다.');
    await page.evaluate(() => {
      const now = Date.now;
      Date.now = () => now() + 120000;
      window.dispatchEvent(new Event('online'));
    });
    await page.getByText('현재 최신 버전을 사용하고 있어요.', { exact: true }).waitFor();
    assert.equal(page.url(), beforeCheckUrl, '연결 복구 시 자동 업데이트 확인도 설정 화면으로 이동시키지 않는다.');

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

    // UA·화면 크기만 모의한다. 실제 Android의 WebAPK 설치·실행 검증을 대신하지 않는다.
    const tablet = await browser.newContext({ viewport: { width: 800, height: 1280 }, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; AGS2-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.179 Safari/537.36' });
    await tablet.addInitScript(() => {
      // 구형 기기에서 선택적 저장소 요청이 동기 예외를 내더라도 첫 화면과 SW 준비는 진행해야 한다.
      Object.defineProperty(navigator.storage, 'persist', { value() { throw new DOMException('storage unavailable', 'SecurityError'); } });
      if (!localStorage.getItem('chintalk-settings')) localStorage.setItem('chintalk-settings', JSON.stringify({ version: 4, state: {
        onboarded: true, voiceMode: 'device', autoDownload: true, installDismissedAt: Date.now(),
      } }));
      if (!localStorage.getItem('chintalk-progress')) localStorage.setItem('chintalk-progress', JSON.stringify({ version: 0, state: { done: { 'v1-01': true } } }));
    });
    const compatibility = await tablet.newPage(); compatibility.setDefaultTimeout(20000);
    compatibility.on('pageerror', e => errors.push(e.message));
    await compatibility.goto(`${base}browser.html#/settings`);
    await compatibility.getByRole('heading', { name: '설정', exact: true }).waitFor();
    await compatibility.getByText('현재 최신 버전을 사용하고 있어요.', { exact: true }).waitFor();
    assert.equal(await compatibility.locator('link[rel=manifest]').count(), 0);
    const pngs = manifest.icons.filter(icon => icon.type === 'image/png');
    assert.ok(pngs.some(icon => icon.sizes === '192x192' && icon.purpose === 'any'));
    assert.ok(pngs.some(icon => icon.sizes === '512x512' && icon.purpose === 'any'));
    assert.ok(pngs.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
    for (const icon of pngs) {
      const decoded = await compatibility.evaluate(async src => {
        const image = await createImageBitmap(await (await fetch(src)).blob());
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = image.width;
        const drawing = canvas.getContext('2d'); drawing.drawImage(image, 0, 0);
        return { size: `${image.width}x${image.height}`, alpha: drawing.getImageData(0, 0, 1, 1).data[3] };
      }, `${base}${icon.src}`);
      assert.equal(decoded.size, icon.sizes); assert.equal(decoded.alpha, 255);
    }
    const regular = await tablet.newPage(); regular.on('pageerror', e => errors.push(e.message));
    await regular.goto(new URL(manifest.start_url, base).href);
    await regular.locator('main h1').waitFor();
    const cdp = await tablet.newCDPSession(regular);
    assert.equal((await cdp.send('Page.getAppManifest')).errors.length, 0);
    assert.deepEqual((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors, []);
    assert.equal(await regular.evaluate(() => JSON.parse(localStorage.getItem('chintalk-progress')).state.done['v1-01']), true);
    await tablet.setOffline(true);
    await compatibility.reload();
    await compatibility.getByRole('heading', { name: '설정', exact: true }).waitFor();
    assert.equal(await compatibility.locator('link[rel=manifest]').count(), 0);
    await compatibility.setViewportSize({ width: 1280, height: 800 });
    assert.equal(await compatibility.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await compatibility.evaluate(() => JSON.parse(localStorage.getItem('chintalk-progress')).state.done['v1-01']), true);
    assert.equal(audioRequests, 0); assert.deepEqual(errors, []);
    await tablet.setOffline(false);
    await compatibility.evaluate(() => {
      const settings = JSON.parse(localStorage.getItem('chintalk-settings'));
      settings.state.installDismissedAt = 0;
      localStorage.setItem('chintalk-settings', JSON.stringify(settings));
    });
    await compatibility.reload();
    await compatibility.getByRole('heading', { name: '설정', exact: true }).waitFor();
    await compatibility.evaluate(() => {
      window.__compatInstallCalls = 0;
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = () => { window.__compatInstallCalls++; return Promise.resolve(); };
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });
    await compatibility.waitForTimeout(1300);
    assert.equal(await compatibility.getByRole('dialog', { name: '앱으로 설치하기', exact: true }).count(), 0);
    assert.equal(await compatibility.evaluate(() => window.__compatInstallCalls), 0, '호환 모드에서는 설치 앱을 다시 권하지 않는다.');
    // 실제 안드로이드 설치는 기기 확인이 필요하다. 여기서는 공식 설치 프롬프트 호출 시 주소를 검증한다.
    await compatibility.goto(`${base}#/settings`);
    await compatibility.getByRole('heading', { name: '설정', exact: true }).waitFor();
    await compatibility.evaluate(() => {
      window.__installPrompts = 0;
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = () => { window.__installPrompts++; window.__installUrl = location.href; return Promise.resolve(); };
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });
    await compatibility.getByRole('dialog', { name: '앱으로 설치하기', exact: true }).waitFor();
    assert.equal(await compatibility.evaluate(() => window.__installPrompts), 0, '자동 안내만으로 설치를 호출하지 않는다.');
    await compatibility.getByRole('button', { name: '설치', exact: true }).click();
    assert.equal(await compatibility.evaluate(() => window.__installPrompts), 1);
    assert.equal(await compatibility.evaluate(() => window.__installUrl), `${base}#/`);
    await tablet.close();
    console.log('PASS: concrete PNG/maskable icons, stable install/start identity, tablet entry, storage API failure, shared records, offline restart and install from Settings starts at home');

    const installed = await browser.newContext();
    await installed.addInitScript(() => {
      localStorage.setItem('chintalk-settings', JSON.stringify({ version: 4, state: {
        onboarded: true, voiceMode: 'device', autoDownload: false, installDismissedAt: Date.now(),
      } }));
      const match = window.matchMedia.bind(window);
      window.matchMedia = query => {
        const media = match(query);
        if (query === '(display-mode: standalone)') Object.defineProperty(media, 'matches', { value: true });
        return media;
      };
    });
    const resumed = await installed.newPage();
    await resumed.goto(`${base}#/settings`);
    await resumed.locator('main h1').waitFor();
    assert.equal(resumed.url(), base, '예전 설치 주소가 설정이어도 새 부팅은 홈으로 정규화한다.');
    await resumed.getByRole('link', { name: '설정', exact: true }).last().click();
    await resumed.getByRole('heading', { name: '설정', exact: true }).waitFor();
    assert.equal(new URL(resumed.url()).hash, '#/settings', '앱 안의 설정 이동은 유지한다.');
    await installed.close();
    console.log('PASS: standalone startup at a remembered Settings URL opens home, while in-app Settings navigation remains available (mode emulation)');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
