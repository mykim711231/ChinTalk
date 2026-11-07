// 기기 식별과 기능 제한을 모의한다. 실제 Android/WebAPK 구동 확인을 대신하지 않는다.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const lesson = JSON.parse(fs.readFileSync(path.join(root, 'data/lessons-vol1.json'), 'utf8'))[0];
const base = 'http://chintalk.test/ChinTalk/';
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png' };
const cases = [
  ['Android 8', 'Mozilla/5.0 (Linux; Android 8.0; AGS2-L09) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36', true],
  ['reduced Android UA', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36', true],
  ['modern Android', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36', false],
  ['modern iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', false],
  ['desktop', undefined, false],
  ['compatibility entry', undefined, true, 'browser.html'],
];
async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  try {
    for (const [name, userAgent, basic, entry = ''] of cases) {
      const context = await browser.newContext({ viewport: { width: 360, height: 800 }, userAgent, serviceWorkers: 'block' });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        const relative = url.pathname.slice('/ChinTalk/'.length) || 'index.html';
        const file = path.resolve(root, relative);
        if (!url.pathname.startsWith('/ChinTalk/') || !file.startsWith(root + path.sep)) return route.fulfill({ status: 404, body: '' });
        try { await route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) }); }
        catch { await route.fulfill({ status: 404, body: '' }); }
      });
      await context.addInitScript(() => {
        if (!localStorage.getItem('chintalk-settings')) localStorage.setItem('chintalk-settings', JSON.stringify({ version: 4, state: {
          onboarded: true, voiceMode: 'device', autoDownload: false, showPinyin: true, installDismissedAt: Date.now(),
        } }));
        window.__spoken = []; window.__micRequests = 0;
        window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
        const events = new EventTarget();
        Object.defineProperty(window, 'speechSynthesis', { value: {
          getVoices: () => [{ name: '本机', lang: 'zh-CN', voiceURI: 'local', localService: true }],
          addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
          cancel() {}, speak(u) { window.__utterance = u; window.__spoken.push(u.text); },
        } });
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia() { window.__micRequests++; throw new Error('unexpected microphone request'); } } });
      });
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const go = async route => { await page.goto(`${base}${entry}#${route}`); await page.locator('main h1').waitFor(); };
      await go('/study');
      assert.equal(await page.getByRole('complementary', { name: '기본 학습 모드 안내' }).count(), basic ? 1 : 0, name);
      assert.equal(await page.getByRole('link', { name: /^10분 데일리/ }).count(), basic ? 0 : 1, name);
      assert.equal(await page.getByRole('link', { name: /^마스터리 정밀 학습/ }).count(), basic ? 0 : 1, name);
      if (basic) {
        await page.getByRole('link', { name: /^교재 학습/ }).waitFor();
        await page.getByRole('combobox', { name: '학습할 과' }).selectOption('v8-20');
        assert.equal(await page.getByRole('link', { name: /^교재 학습/ }).getAttribute('href'), '#/lesson/v8-20');
        await go('/lesson/v1-01');
        await page.getByRole('button', { name: '본문 전체 듣기', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: /4단계 마스터리/ }).count(), 0);
        assert.ok(await page.locator('ruby rt').count());
        await page.getByRole('button', { name: '본문 전체 듣기', exact: true }).click();
        assert.equal(await page.evaluate(() => window.__spoken[0]), lesson.text[0].zh);
        await page.getByRole('button', { name: '멈추기', exact: true }).click();
        await page.getByRole('button', { name: '회화', exact: true }).click();
        await page.getByRole('button', { name: '회화 전체 듣기', exact: true }).click();
        assert.equal(await page.evaluate(() => window.__spoken.at(-1)), lesson.dialogs[0].turns[0].verse.zh);
        await page.getByRole('button', { name: '멈추기', exact: true }).click();
        await go('/lesson/v1-01/mastery');
        await page.getByRole('heading', { name: '마스터리 정밀 학습 이용 안내', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: '3. Shadowing', exact: true }).count(), 0);
        await go('/daily?id=v1-01');
        await page.getByRole('heading', { name: '10분 데일리 이용 안내', exact: true }).waitFor();
        await go('/passive?source=all');
        await page.getByText('바로 듣기 160/160과', { exact: true }).waitFor();
        await page.getByRole('button', { name: '재생', exact: true }).click();
        await page.waitForFunction(() => window.__spoken.length > 0);
        await page.getByRole('button', { name: '멈춤', exact: true }).click();
        assert.equal(await page.evaluate(() => window.__micRequests), 0);
        // 접근 허용을 위해 가짜 마스터리·데일리 완료 기록을 만들지 않는다.
        const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('chintalk-progress'))?.state);
        assert.ok(!progress?.mastered || Object.keys(progress.mastered).length === 0);
        assert.ok(!progress?.dailyDone || Object.keys(progress.dailyDone).length === 0);
        await go('/settings');
        await page.getByText('현재 사용 모드: 기본 학습', { exact: true }).waitFor();
        if (entry) {
          await page.getByRole('link', { name: '일반 주소로 열기', exact: true }).click();
          await page.locator('main h1').waitFor();
          assert.equal(await page.getByRole('complementary', { name: '기본 학습 모드 안내' }).count(), 0);
          assert.equal(new URL(page.url()).pathname, '/ChinTalk/');
        }
      } else {
        await go('/lesson/v1-01/mastery');
        await page.getByRole('button', { name: '3. Shadowing', exact: true }).waitFor();
        await go('/daily?id=v1-01');
        await page.getByRole('heading', { name: '10분 데일리', exact: true }).waitFor();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name);
      assert.deepEqual(errors, [], name);
      await context.close();
      console.log(`PASS: ${name}: ${basic ? 'basic reading/listening, blocked advanced routes and no microphone request' : 'full study modes preserved'}`);
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
