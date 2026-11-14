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
// [label, 한자, 병음, 한글, shuffle, shadow]
const fullPasses = [['모두 표시', true, true, true], ['모두 표시', true, true, true], ['소리만 (화면 가림)', false, false, false], ['한자·병음 (뜻 숨김)', true, true, false], ['한자만 (따라 말하기)', true, false, false], ['소리만 (따라 말하기)', false, false, false], ['한자만 (먼저 읽고 확인)', true, false, false], ['한글만 (떠올린 뒤 확인)', false, false, true], ['모두 표시 (확인)', true, true, true], ['한글만 (순서 섞음)', false, false, true, true]];
const dialogPasses = fullPasses.map(p => p[4] ? ['한글만 (대화 순서대로)', false, false, true] : p);
const vocabPasses = [['모두 표시', true, true, true], ['한자·병음 (뜻 숨김)', true, true, false], ['병음만', false, true, false], ['한자만 (따라 말하기)', true, false, false], ['한글만 (떠올린 뒤 확인)', false, false, true]];
const hanzi = (t) => (t.match(/[一-鿿]/g) || []).length;
const leadsOf = (list, base, per) => list.map(v => base + per * hanzi(v.zh));

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
        window.__delays = [];
        window.setTimeout = (fn, ms, ...args) => { if (ms >= 500) window.__delays.push(ms); return timeout(fn, ms >= 500 ? 10 : ms, ...args); };
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
      await page.getByRole('button', { name: '본문 10회 학습 듣기', exact: true }).waitFor();
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
      const delaysOf = (expected) => page.evaluate((exp) => exp.filter((ms) => window.__delays.includes(ms)).length, expected);
      const run = async (tab, verses) => {
        const passes = tab === '회화' ? dialogPasses : fullPasses;
        await page.getByRole('button', { name: tab, exact: true }).click();
        await page.evaluate(() => { window.__spoken = []; window.__delays = []; });
        await page.getByRole('button', { name: `${tab} 10회 학습 듣기`, exact: true }).click();
        const expected = [];
        for (let pass = 0; pass < passes.length; pass++) {
          const ks = [];
          for (let i = 0; i < verses.length; i++) {
            await page.waitForFunction(n => window.__spoken.length === n, pass * verses.length + i + 1);
            await page.getByRole('status').filter({ hasText: `${pass + 1}/10회 · ${passes[pass][0]} · ${i + 1}/${verses.length}문장` }).waitFor();
            const k = Number(await current().getAttribute('data-playback-line')); ks.push(k);
            if (!passes[pass][4]) assert.equal(k, i);
            assert.equal((await page.evaluate(() => window.__spoken)).at(-1), verses[k].zh);
            assert.equal(await current().locator('.reading-zh').count(), passes[pass][1] ? 1 : 0);
            assert.equal(await current().locator('.reading-pinyin, rt').count() > 0, passes[pass][2]);
            assert.equal(await current().getByText(verses[k].ko, { exact: true }).count(), passes[pass][3] ? 1 : 0);
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
          assert.deepEqual([...ks].sort((x, y) => x - y), verses.map((_, i) => i)); // 모든 문장을 한 번씩
          if (passes[pass][4] && verses.length > 1) assert.notDeepEqual(ks, verses.map((_, i) => i)); // 섞인 순서
          expected.push(...ks.map(k => verses[k].zh));
        }
        await page.getByText('10회 학습 듣기를 마쳤어요. 기존 표시 설정으로 돌아왔어요.', { exact: true }).waitFor();
        assert.deepEqual(await page.evaluate(() => window.__spoken), expected);
        assert.equal(await delaysOf(leadsOf(verses, 2000, 300)) >= verses.length, true); // 한글만 회차 재생 전 대기(문장 길이 비례)
        assert.equal(await delaysOf(leadsOf(verses, 1000, 250)) >= verses.length, true); // 한자만 먼저 읽기 회차 대기
        await restored();
      };
      const runVocab = async () => {
        await page.getByRole('button', { name: '단어', exact: true }).click();
        await page.evaluate(() => { window.__spoken = []; window.__delays = []; });
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
        assert.deepEqual(await page.evaluate(() => window.__spoken), Array.from({ length: vocabPasses.length }, () => vocab.map(v => v.zh)).flat());
        assert.equal(await delaysOf(leadsOf(vocab, 1500, 200)) >= vocab.length, true); // 한글만 회차에만 재생 전 대기(길이 비례)
        assert.equal(await current().count(), 0); // 단어 탭은 표시 칩이 비활성이라 설정 저장값만 확인
        assert.equal(await page.evaluate(() => localStorage.getItem('chintalk-settings')), settings);
      };
      await run('본문', body);
      await runVocab();
      // 문법·발음 함정: 가림 단계 없이 전체 듣기만 제공하고, 한글 해설은 줄마다 한 번 더 읽는다.
      const runReadOnly = async (tab, once, withKo) => {
        await page.getByRole('button', { name: tab, exact: true }).click();
        assert.equal(await page.getByRole('button', { name: /회 학습 듣기/ }).count(), 0);
        const n = await page.locator('[data-playback-line]').count();
        assert.ok(n > 0, tab + ' 읽을 줄이 있어야 한다');
        await page.evaluate(() => { window.__spoken = []; });
        await page.getByRole('button', { name: once, exact: true }).click();
        for (let i = 0; i < n; i++) {
          await page.waitForFunction(k => window.__spoken.length === k, withKo ? i * 2 + 1 : i + 1);
          assert.equal(await current().getAttribute('data-playback-line'), String(i));
          await page.evaluate(() => window.__utterance.onend?.());
          if (withKo) { await page.waitForFunction(k => window.__spoken.length === k, i * 2 + 2); await page.evaluate(() => window.__utterance.onend?.()); }
        }
        await page.waitForFunction(() => !document.querySelector('[data-playback-line][aria-current=true]'));
        const spoken = await page.evaluate(() => window.__spoken);
        assert.equal(spoken.length, withKo ? n * 2 : n);
        assert.ok(spoken.filter((_, i) => !withKo || i % 2 === 0).every(t => /[一-鿿]/.test(t)));
      };
      await runReadOnly('문법', '문법 전체 듣기', false);
      await runReadOnly('문법', '문법 + 한글 해설 듣기', true);
      await runReadOnly('발음 함정', '함정 전체 듣기', false);
      await runReadOnly('발음 함정', '함정 + 한글 해설 듣기', true);
      for (const [tab, label] of [['본문', '본문 + 한글 듣기'], ['회화', '회화 + 한글 듣기']]) {
        await page.getByRole('button', { name: tab, exact: true }).click();
        await page.evaluate(() => { window.__spoken = []; });
        await page.getByRole('button', { name: label, exact: true }).click();
        await page.waitForFunction(() => window.__spoken.length === 1);
        await page.evaluate(() => window.__utterance.onend?.());
        await page.waitForFunction(() => window.__spoken.length === 2);
        const [zh, ko] = await page.evaluate(() => window.__spoken);
        assert.ok(/[一-鿿]/.test(zh) && /[가-힣]/.test(ko) && !/[一-鿿]/.test(ko), tab + ' 중국어 다음 한글이 나와야 한다');
        await page.getByRole('button', { name: '한글 포함 듣기 멈추기', exact: true }).click();
      }
      await context.setOffline(true);
      await run('회화', dialog);
      await context.setOffline(false);
      console.log(`PASS: ${basic ? 'basic mode' : 'full mode'}: whole-body and multi-section dialogue repeat exactly ten times (five for vocab), captions match each pass, follow at 320px, offline device voice, original settings preserved`);

      // 새 재생으로 교체한 뒤 이전 음성의 종료 콜백이 와도 새 큐·표시를 지우면 안 된다.
      await page.getByRole('button', { name: '본문', exact: true }).click();
      await page.getByRole('button', { name: '본문 10회 학습 듣기', exact: true }).click();
      await page.evaluate(() => { window.__old = window.__utterance; });
      await page.getByRole('button', { name: '본문 전체 듣기', exact: true }).click();
      await page.evaluate(() => window.__old.onend?.());
      await page.waitForTimeout(50);
      assert.equal(await page.getByRole('button', { name: '학습 듣기 멈추기', exact: true }).count(), 0);
      assert.equal(await current().getAttribute('data-playback-line'), '0');
      await page.getByRole('button', { name: '멈추기', exact: true }).click(); await restored();
      await page.getByRole('button', { name: '본문 10회 학습 듣기', exact: true }).click();
      await page.getByRole('button', { name: '학습 듣기 멈추기', exact: true }).click(); await restored();
      let count = await page.evaluate(() => window.__spoken.length);
      await page.evaluate(() => window.__utterance.onend?.()); await page.waitForTimeout(50);
      assert.equal(await page.evaluate(() => window.__spoken.length), count);
      await page.getByRole('button', { name: '본문 10회 학습 듣기', exact: true }).click();
      await current().getByRole('button', { name: '듣기', exact: true }).click(); await restored();
      await page.getByRole('button', { name: '본문 10회 학습 듣기', exact: true }).click();
      await page.getByRole('button', { name: '회화', exact: true }).click(); await restored();
      count = await page.evaluate(() => window.__spoken.length);
      await page.evaluate(() => window.__utterance.onend?.()); await page.waitForTimeout(50);
      assert.equal(await page.evaluate(() => window.__spoken.length), count);
      // 오프라인 음성팩이 없는 경우에도 표시 전환을 남기지 않는다.
      await context.setOffline(true); await page.evaluate(() => { window.__voices = []; });
      await page.getByRole('button', { name: '회화 10회 학습 듣기', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: '오프라인 기기 음성이 없어요.' }).waitFor(); await restored();
      await context.setOffline(false);
      await page.getByRole('link', { name: '다음 과', exact: true }).click();
      await page.getByRole('button', { name: '회화 10회 학습 듣기', exact: true }).waitFor();
      await page.getByRole('button', { name: '본문', exact: true }).click();
      await page.getByRole('button', { name: '본문 10회 학습 듣기', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: '본문 10회 학습 듣기', exact: true }).isDisabled(), true);
      await restored();
      assert.equal(audioRequests, 0); assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      console.log('PASS: normal/learning handoff, stop, individual playback, tab/lesson navigation, empty content and voice failure restore settings without extra playback or mp3 downloads');
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
