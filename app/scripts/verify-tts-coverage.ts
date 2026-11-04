// 모든 콘텐츠 텍스트가 manifest + mp3 파일로 커버되는지 검증. 사용: npm run verify:tts [-- --vol 1]
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { collectTexts, hashOf, loadLessons, readManifest, TTS_DIR } from './tts-texts';

const i = process.argv.indexOf('--vol');
const vols = i >= 0 && process.argv[i + 1] !== 'all' ? [parseInt(process.argv[i + 1], 10)] : [1, 2, 3, 4, 5, 6, 7, 8];
const manifest = readManifest();
let bad = 0;
for (const v of vols) {
  const texts = [...new Set(collectTexts(loadLessons(v)))];
  const missing = texts.filter((t) => {
    const f = manifest[t];
    if (!f || f !== `${hashOf(t)}.mp3`) return true;
    const p = join(TTS_DIR, f);
    return !existsSync(p) || statSync(p).size < 500;
  });
  console.log(`vol${v}: ${texts.length - missing.length}/${texts.length} 커버${missing.length ? ` — 누락 ${missing.length}` : ''}`);
  missing.slice(0, 5).forEach((t) => console.log(`   · ${t}`));
  bad += missing.length;
}
process.exit(bad ? 1 : 0);
