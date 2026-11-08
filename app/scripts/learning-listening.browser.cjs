const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const lessons = JSON.parse(fs.readFileSync(path.join(root, 'data/lessons-vol1.json'), 'utf8'));
const body = lessons.flatMap(l => l.text).slice(0, 3);
const dialog = lessons.flatMap(l => l.dialogs.flatMap(d => d.turns.map(t => t.verse))).slice(0, 3);
lessons[1].text = body;
lessons[1].dialogs = [{ title: '회화 1', turns: dialog.slice(0, 2).map(verse => ({ speaker: 'A', verse })) }, { title: '회화 2', turns: dialog.slice(2).map(verse => ({ speaker: 'B', verse })) }];
const vocab = lessons[1].vocab.filter((w) => w.exZh).slice(0, 3);
lessons[1].vocab = vocab;
lessons[2].text = []; lessons[2].dialogs = [];
const base = 'http://chintalk.test/ChinTalk/';
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png' };
const passes = [['모두 표시', true, true, true], ['한자·병음 (뜻 숨김)', true, true, false], ['병음만', false, true, false], ['한자만', true, false, false], ['한글만 (떠올린 뒤 확인)', false, false, true]];
const vocabPasses = passes;

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  try {
    for (const basic of [false, true]) {
      const context = await browser.newContext({ viewport: { width: 320, height: 720 }, reducedMotion: 'reduce', serviceWorkers: 'block',
        ...(basic ? { userAgent: 'Mozilla/5.0 (Linux; Android 8.0; AGS2-L09) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36' } : {}) });
      let audioRequests = 0;
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        const relative = url.pathname.slice('/ChinTalk/'.length) || 'index.html';
        const file = path.resolve(root, relative);
        if (relative.startsWith('tts/')) audioRequests++;
        if (!url.pathname.startsWith('/ChinTalk/') || !file.startsWith(root + path.sep)) return route.fulfill({ status: 404, body: '' });
        try { await route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body: relative === 'data/lessons-vol1.json' ? JSON.stringify(lessons) : fs.readFileSync(file) }); }
        catch { await route.fulfill({ status: 404, body: '' }); }
      });
      await context.addInitScript(() => {
        if (!localStorage.getItem('chintalk-settings')) localStorage.setItem('chintalk-settings', JSON.stringify({ version: 4, state: {
          onboarded: true, voiceMode: 'device', autoDownload: false, showZh: false, showPinyin: false, showKo: true, showMeaningUnits: true, installDismissedAt: Date.now(),
        } }));
        window.__spoken = []; window.__voices = [{ lang: 'zh-CN', name: '本机', voiceURI: 'local', localService: true }];
        const timeout = window.setTimeout.bind(window);
        window.__leads = 0;
        window.setTimeout = (fn, ms, ...args) => { if (ms === 1500 || ms === 2000) window.__leads++; return timeout(fn, ms === 1000 || ms === 1500 || ms === 2000 ? 10 : ms, ...args); };
        window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
        const events = new EventTarget();
        Object.defineProperty(window, 'speechSynthesis', { value: {
          getVoices: () => window.__voices,
          addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
          cancel() {}, speak(u) { window.__utterance = u; window.__spoken.push(u.text); },
        } });
      });
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}#/lesson/v1-02`);
      await page.getByRole('button', { name: '본문 5회 학습 듣기', exact: true }).waitFor();
      const settings = await page.evaluate(() => localStorage.getItem('chintalk-settings'));
      const current = () => page.locator('[data-playback-line][aria-current=true]');
      const restored = async () => {
        assert.equal(await current().count(), 0);
        for (const [name, pressed] of [['한자', false], ['병음', false], ['한글', true]]) {
          const chip = page.getByRole('button', { name, exact: true });
          assert.equal(await chip.getAttribute('aria-pressed'), String(pressed)); assert.equal(await chip.isEnabled(), true);
        }
        assert.equal(await page.evaluate(() => localStorage.getItem('chintalk-settings')), settings);
      };
      const run = async (tab, verses) => {
        await page.getByRole('button', { name: tab, exact: true }).click();
        await page.evaluate(() => { window.__spoken = []; window.__leads = 0; });
        await page.getByRole('button', { name: `${tab} 5회 학습 듣기`, exact: true }).click();
        for (let pass = 0; pass < 5; pass++) for (let i = 0; i < verses.length; i++) {
          await page.waitForFunction(n => window.__spoken.length === n, pass * verses.length + i + 1);
          await page.getByRole('status').filter({ hasText: `${pass + 1}/5회 · ${passes[pass][0]} · ${i + 1}/${verses.length}문장` }).waitFor();
          assert.equal(await current().getAttribute('data-playback-line'), String(i));
          assert.equal(await current().locator('.reading-zh').count(), passes[pass][1] ? 1 : 0);
          assert.equal(await current().locator('.reading-pinyin, rt').count() > 0, passes[pass][2]);
          assert.equal(await current().getByText(verses[i].ko, { exact: true }).count(), passes[pass][3] ? 1 : 0);
          for (const [j, name] of ['한자', '병음', '한글'].entries()) {
            assert.equal(await page.getByRole('button', { name, exact: true }).getAttribute('aria-pressed'), String(passes[pass][j + 1]));
            assert.equal(await page.getByRole('button', { name, exact: true }).isDisabled(), true);
          }
          await page.waitForFunction(() => {
            const line = document.querySelector('[data-playback-line][aria-current=true]')?.getBoundingClientRect();
            const controls = document.querySelector('[aria-label="듣기 설정"]').getBoundingClientRect();
            return line && line.top >= controls.bottom - 1;
          });
          await page.evaluate(() => window.__utterance.onend?.());
        }
        await page.getByText('5회 학습 듣기를 마쳤어요. 기존 표시 설정으로 돌아왔어요.', { exact: true }).waitFor();
        assert.deepEqual(await page.evaluate(() => window.__spoken), Array.from({ length: 5 }, () => verses.map(v => v.zh)).flat());
        assert.equal(await page.evaluate(() => window.__leads), verses.length); // 한글만 회차에만 재생 전 대기
        await restored();
      };
      const runVocab = async () => {
        await page.getByRole('button', { name: '단어', exact: true }).click();
        await page.evaluate(() => { window.__spoken = []; window.__leads = 0; });
        await page.getByRole('button', { name: '단어 5회 학습 듣기', exact: true }).click();
        for (let pass = 0; pass < 5; pass++) for (let i = 0; i < vocab.length; i++) {
          await page.waitForFunction(n => window.__spoken.length === n, pass * vocab.length + i + 1);
          await page.getByRole('status').filter({ hasText: `${pass + 1}/5회 · ${vocabPasses[pass][0]} · ${i + 1}/${vocab.length}단어` }).waitFor();
          const card = current(); const [, zh, py, ko] = vocabPasses[pass];
          assert.equal(await card.getAttribute('data-playback-line'), String(i));
          assert.equal(await card.locator('.reading-zh').count(), zh ? 1 : 0);
          assert.equal(await card.locator('.reading-pinyin').count() > 0, py);
          assert.equal(await card.getByText(vocab[i].ko, { exact: true }).count(), ko ? 1 : 0);
          assert.equal(await card.getByText(vocab[i].exZh, { exact: true }).count(), pass === 0 ? 1 : 0);
          await page.evaluate(() => window.__utterance.onend?.());
        }
        await page.getByText('5회 학습 듣기를 마쳤어요. 기존 표시 설정으로 돌아왔어요.', { exact: true }).waitFor();
        assert.deepEqual(await page.evaluate(() => window.__spoken), Array.from({ length: 5 }, () => vocab.map(v => v.zh)).flat());
        assert.equal(await page.evaluate(() => window.__leads), vocab.length); // 한글만 회차에만 재생 전 대기
        assert.equal(await current().count(), 0); // 단어 탭은 표시 칩이 비활성이라 설정 저장값만 확인
        assert.equal(await page.evaluate(() => localStorage.getItem('chintalk-settings')), settings);
      };
      await run('본문', body);
      await runVocab();
      await context.setOffline(true);
      await run('회화', dialog);
      await context.setOffline(false);
      console.log(`PASS: ${basic ? 'basic mode' : 'full mode'}: whole-body and multi-section dialogue repeat exactly five times, captions match each pass, follow at 320px, offline device voice, original settings preserved`);

      // 새 재생으로 교체한 뒤 이전 음성의 종료 콜백이 와도 새 큐·표시를 지우면 안 된다.
      await page.getByRole('button', { name: '본문', exact: true }).click();
      await page.getByRole('button', { name: '본문 5회 학습 듣기', exact: true }).click();
      await page.evaluate(() => { window.__old = window.__utterance; });
      await page.getByRole('button', { name: '본문 전체 듣기', exact: true }).click();
      await page.evaluate(() => window.__old.onend?.());
      await page.waitForTimeout(50);
      assert.equal(await page.getByRole('button', { name: '학습 듣기 멈추기', exact: true }).count(), 0);
      assert.equal(await current().getAttribute('data-playback-line'), '0');
      await page.getByRole('button', { name: '멈추기', exact: true }).click(); await restored();
      await page.getByRole('button', { name: '본문 5회 학습 듣기', exact: true }).click();
      await page.getByRole('button', { name: '학습 듣기 멈추기', exact: true }).click(); await restored();
      let count = await page.evaluate(() => window.__spoken.length);
      await page.evaluate(() => window.__utterance.onend?.()); await page.waitForTimeout(50);
      assert.equal(await page.evaluate(() => window.__spoken.length), count);
      await page.getByRole('button', { name: '본문 5회 학습 듣기', exact: true }).click();
      await current().getByRole('button', { name: '듣기', exact: true }).click(); await restored();
      await page.getByRole('button', { name: '본문 5회 학습 듣기', exact: true }).click();
      await page.getByRole('button', { name: '회화', exact: true }).click(); await restored();
      count = await page.evaluate(() => window.__spoken.length);
      await page.evaluate(() => window.__utterance.onend?.()); await page.waitForTimeout(50);
      assert.equal(await page.evaluate(() => window.__spoken.length), count);
      // 오프라인 음성팩이 없는 경우에도 표시 전환을 남기지 않는다.
      await context.setOffline(true); await page.evaluate(() => { window.__voices = []; });
      await page.getByRole('button', { name: '회화 5회 학습 듣기', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: '오프라인 기기 음성이 없어요.' }).waitFor(); await restored();
      await context.setOffline(false);
      await page.getByRole('link', { name: '다음 과', exact: true }).click();
      await page.getByRole('button', { name: '회화 5회 학습 듣기', exact: true }).waitFor();
      await page.getByRole('button', { name: '본문', exact: true }).click();
      await page.getByRole('button', { name: '본문 5회 학습 듣기', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: '본문 5회 학습 듣기', exact: true }).isDisabled(), true);
      await restored();
      assert.equal(audioRequests, 0); assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      console.log('PASS: normal/learning handoff, stop, individual playback, tab/lesson navigation, empty content and voice failure restore settings without extra playback or mp3 downloads');
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
