const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const lessons = JSON.parse(fs.readFileSync(path.join(root, 'data/lessons-vol1.json'), 'utf8'));
const sentences = lessons.flatMap(l => l.text);
lessons[1].text = sentences.slice(0, 12);
lessons[1].dialogs = [
  { title: '회화 1', turns: sentences.slice(12, 18).map(verse => ({ speaker: 'A', verse })) },
  { title: '회화 2', turns: sentences.slice(18, 24).map(verse => ({ speaker: 'B', verse })) },
];
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
async function main() {
  const base = 'http://chintalk.test/ChinTalk/';
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    // 배포·PWA 업데이트는 별도 테스트로 검증한다. 실제 빌드를 그려 화면의 이동을 측정한다.
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      const relative = url.pathname.slice('/ChinTalk/'.length) || 'index.html';
      const file = path.resolve(root, relative);
      if (!url.pathname.startsWith('/ChinTalk/') || !file.startsWith(root + path.sep)) return route.fulfill({ status: 404, body: '' });
      try {
        await route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream',
          body: relative === 'data/lessons-vol1.json' ? JSON.stringify(lessons) : fs.readFileSync(file) });
      } catch { await route.fulfill({ status: 404, body: '' }); }
    });
    await context.addInitScript(() => {
      localStorage.setItem('chintalk-settings', JSON.stringify({ version: 4, state: { onboarded: true, voiceMode: 'device', autoDownload: false, showPinyin: true, installDismissedAt: Date.now() } }));
      window.__spoken = []; window.__scrolls = [];
      const timeout = window.setTimeout.bind(window), scroll = window.scrollTo.bind(window);
      window.setTimeout = (fn, ms, ...args) => timeout(fn, [400, 1000].includes(ms) ? 10 : ms, ...args);
      window.scrollTo = (...args) => { window.__scrolls.push(args); scroll(...args); };
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      const events = new EventTarget();
      Object.defineProperty(window, 'speechSynthesis', { value: {
        getVoices: () => [{ name: '本机', lang: 'zh-CN', voiceURI: 'local', localService: true }],
        addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
        cancel() {}, speak(u) { window.__utterance = u; window.__spoken.push(u.text); },
      } });
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const current = () => page.locator('[data-playback-line][aria-current="true"]');
    const visible = async index => {
      await page.waitForFunction(i => document.querySelector('[data-playback-line][aria-current=true]')?.getAttribute('data-playback-line') === String(i), index);
      await page.waitForTimeout(40);
      const box = await current().evaluate(el => {
        const r = el.getBoundingClientRect(), c = document.querySelector('.playback-controls').getBoundingClientRect();
        const bottom = document.querySelector('[data-app-bottom-nav]').getBoundingClientRect().top;
        return { top: r.top, bottom: r.bottom, height: r.height, controlsBottom: c.bottom, navTop: bottom };
      });
      assert.ok(box.top >= box.controlsBottom - 1, JSON.stringify(box));
      if (box.height <= box.navTop - box.controlsBottom - 24) assert.ok(box.bottom <= box.navTop - 10, JSON.stringify(box));
    };
    const advance = async index => { await page.evaluate(() => window.__utterance.onend?.()); await visible(index); };
    const stop = async () => {
      await page.getByRole('button', { name: '멈추기', exact: true }).click();
      const y = await page.evaluate(() => scrollY), n = await page.evaluate(() => window.__spoken.length);
      await page.evaluate(() => window.__utterance.onend?.()); await page.waitForTimeout(80);
      assert.equal(await current().count(), 0);
      assert.equal(await page.evaluate(() => window.__spoken.length), n);
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - y) < 2);
    };
    await page.goto(`${base}#/lesson/v1-02/mastery?source=text`, { waitUntil: 'commit' });
    for (const source of ['text', 'dialog', 'all']) for (const stage of ['2. 구조 분석', '3. 따라 말하기']) {
      const name = { text: '본문', dialog: '회화', all: '본문+회화' }[source];
      await page.getByRole('group', { name: '학습 대상', exact: true }).getByRole('button', { name, exact: true }).click();
      await page.getByRole('button', { name: stage, exact: true }).click();
      await page.getByRole('button', { name: `${name} 전체 듣기`, exact: true }).click();
      await visible(0);
      for (let i = 1; i < 8; i++) await advance(i);
      assert.ok(await page.evaluate(() => scrollY > 0));
      assert.ok(await page.evaluate(() => !!document.activeElement.closest('[aria-label="듣기와 표시 설정"]')));
      await stop();
    }
    console.log('PASS: Script/Shadowing follow text, all dialogue sections and combined targets; active sentence stays clear of menus, stop stays accessible and focus is not moved');

    await page.getByRole('button', { name: '2. 구조 분석', exact: true }).click();
    await page.getByRole('button', { name: '본문+회화 전체 듣기', exact: true }).click();
    await visible(0);
    for (let i = 1; i <= 13; i++) await advance(i);
    assert.equal(await page.evaluate(() => window.__spoken.at(-1)), lessons[1].dialogs[0].turns[1].verse.zh);
    await page.setViewportSize({ width: 320, height: 640 });
    await page.evaluate(() => document.documentElement.style.setProperty('--fs', '1.4'));
    await advance(14);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await stop();
    console.log('PASS: combined playback crosses from body into dialogue, including 320px viewport and enlarged text');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: '1. 듣고 이해', exact: true }).click();
    await page.getByRole('group', { name: '한글 뜻 선택' }).waitFor();
    assert.equal(await page.getByRole('button', { name: '본문+회화 전체 듣기', exact: true }).count(), 0);
    await page.getByRole('button', { name: '4. 떠올리기', exact: true }).click();
    await page.getByRole('region', { name: '떠올리기 카드' }).waitFor();
    assert.equal(await page.getByRole('button', { name: '본문+회화 전체 듣기', exact: true }).count(), 0);
    console.log('PASS: quiz and recall cards replace the old blind/final stages without the play-all queue');

    await page.getByRole('link', { name: /과 참고/ }).click();
    for (const tab of ['본문', '회화']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await page.getByRole('button', { name: `${tab} 전체 듣기`, exact: true }).click();
      await visible(0);
      for (let i = 1; i < 8; i++) await advance(i);
      await current().getByRole('button', { name: '듣기', exact: true }).click();
      assert.equal(await current().count(), 0);
      const n = await page.evaluate(() => window.__spoken.length);
      await page.evaluate(() => window.__utterance.onend?.()); await page.waitForTimeout(80);
      assert.equal(await page.evaluate(() => window.__spoken.length), n);
    }
    assert.ok(await page.evaluate(() => window.__scrolls.some(args => args[0]?.behavior === 'instant')));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: '본문', exact: true }).click();
    await page.getByRole('button', { name: /^심화 학습/ }).click();
    await page.getByRole('button', { name: '3. 따라 말하기', exact: true }).click();
    await page.evaluate(() => { window.__scrolls = []; });
    await page.getByRole('button', { name: '본문 전체 듣기', exact: true }).click();
    await page.waitForTimeout(700); await visible(0);
    assert.ok(await page.evaluate(() => window.__scrolls.some(args => args[0]?.behavior === 'instant')));
    await stop();
    assert.deepEqual(errors, []);
    console.log('PASS: lesson body/dialogue auto-follow, individual playback cancels the queue, instant scrolling, no browser errors');
    await context.close();
  } finally { await browser?.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
