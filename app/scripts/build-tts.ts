// zh 텍스트 → mp3 사전 합성 (msedge-tts). 사용: npm run build:tts -- --vol 1   (또는 --vol all)
// 빌드 타임에 1회만 합성하고 결과 mp3를 커밋한다. 이미 있는 파일은 건너뛴다.
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { collectTexts, collectKo, hashOf, koHashOf, loadLessons, readManifest, readKoManifest, MANIFEST, KO_MANIFEST as KO_MAN, TTS_DIR } from './tts-texts';

const KO = process.argv.includes('--lang') && process.argv[process.argv.indexOf('--lang') + 1] === 'ko';
const VOICE = KO ? 'ko-KR-SunHiNeural' : 'zh-CN-XiaoxiaoNeural';
const hashFn = KO ? koHashOf : hashOf;
const collect = KO ? collectKo : collectTexts;
const MAN_PATH = KO ? KO_MAN : MANIFEST;
const arg = process.argv.indexOf('--vol');
const volArg = arg >= 0 ? process.argv[arg + 1] : '1';
const vols = volArg === 'all' ? [1, 2, 3, 4, 5, 6, 7, 8] : [parseInt(volArg, 10)];
const limitIdx = process.argv.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1], 10) : Infinity;

mkdirSync(TTS_DIR, { recursive: true });
const manifest = KO ? readKoManifest() : readManifest();

async function synth(tts: MsEdgeTTS, text: string): Promise<Buffer> {
  const { audioStream } = tts.toStream(text);
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    audioStream.on('data', (d: Buffer) => chunks.push(d));
    audioStream.on('error', reject);
    audioStream.on('close', () => (chunks.length ? resolve(Buffer.concat(chunks)) : reject(new Error('empty audio'))));
  });
}

async function newClient() {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  return tts;
}

const texts = vols.flatMap((v) => collect(loadLessons(v)));
const todo = [...new Set(texts)].filter((t) => !existsSync(join(TTS_DIR, `${hashFn(t)}.mp3`)));
console.log(`vols=${vols} texts=${new Set(texts).size} todo=${todo.length}`);

let tts = await newClient();
let ok = 0, fail = 0;
for (const t of todo.slice(0, limit)) {
  const file = `${hashFn(t)}.mp3`;
  let done = false;
  for (let attempt = 1; attempt <= 3 && !done; attempt++) {
    try {
      writeFileSync(join(TTS_DIR, file), await synth(tts, t));
      manifest[t] = file;
      ok++; done = true;
    } catch (e) {
      console.warn(`retry ${attempt}: ${t} (${(e as Error).message})`);
      try { tts.close(); } catch { /* ignore */ }
      tts = await newClient();
    }
  }
  if (!done) fail++;
  if ((ok + fail) % 50 === 0) { writeFileSync(MAN_PATH, JSON.stringify(manifest)); console.log(`${ok + fail}/${todo.length}`); }
}
// 이미 존재하는 파일도 manifest에 반영
for (const t of texts) if (existsSync(join(TTS_DIR, `${hashFn(t)}.mp3`))) manifest[t] = `${hashFn(t)}.mp3`;
writeFileSync(MAN_PATH, JSON.stringify(manifest));
try { tts.close(); } catch { /* ignore */ }

let bytes = 0;
for (const t of new Set(texts)) { const p = join(TTS_DIR, `${hashFn(t)}.mp3`); if (existsSync(p)) bytes += statSync(p).size; }
console.log(`synthesized=${ok} failed=${fail} size(selected vols)=${(bytes / 1024 / 1024).toFixed(2)}MB`);
if (fail) process.exit(1);
