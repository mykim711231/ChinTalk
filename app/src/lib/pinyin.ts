// 글자별 병음: 단어 단위로 적힌 병음("Zǎoshang hǎo!")을 한자 1자당 1음절로 나눈다.
const TONES: Record<string, string> = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a', ē: 'e', é: 'e', ě: 'e', è: 'e', ī: 'i', í: 'i', ǐ: 'i', ì: 'i',
  ō: 'o', ó: 'o', ǒ: 'o', ò: 'o', ū: 'u', ú: 'u', ǔ: 'u', ù: 'u', ǖ: 'ü', ǘ: 'ü', ǚ: 'ü', ǜ: 'ü', ń: 'n', ň: 'n', ǹ: 'n', ḿ: 'm',
};
const base = (c: string) => TONES[c.toLowerCase()] ?? c.toLowerCase();

const INITIALS = ['', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'];
const FINALS = ['a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'er', 'i', 'ia', 'ie', 'iao', 'iu', 'ian', 'in',
  'iang', 'ing', 'iong', 'u', 'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang', 'ueng', 'ü', 'ue', 'üe', 'üan', 'ün'];
const SYL = new Set<string>(['r', 'n', 'ng', 'm', 'hm']);
for (const i of INITIALS) for (const f of FINALS) if (!(i && f === 'er')) SYL.add(i + f);

const isHan = (c: string) => /[一-鿿㐀-䶿〇]/.test(c);
const isLetter = (c: string) => /[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ]/.test(c.toLowerCase());

/** 병음 문자열 → 음절(성조 표기 유지) 배열. 영문·숫자·이메일 등 비병음 토큰은 건너뛴다. */
export function splitSyllables(pinyin: string): string[] {
  // 이메일 주소(wang@mail.com 등)는 비병음이므로 제거
  const cleaned = pinyin.replace(/[\w.+-]+@[\w.-]+/g, '');
  const out: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    if (!isLetter(cleaned[i])) { i++; continue; }
    let j = i;
    while (j < cleaned.length && isLetter(cleaned[j])) j++;
    const word = cleaned.slice(i, j);
    const plain = [...word].map(base).join('');
    // 영어(비병음) 토큰 건너뛰기: 전부 대문자인 약어(AI·AA 등)이거나,
    // 병음 음절로 온전히 분해되지 않는 경우(App 등)
    const allUpper = /^[A-Z]{2,}$/.test(word); // 한 글자 대문자(A=啊 등)는 병음일 수 있으므로 제외
    let fullyPinyin = true;
    let p0 = 0;
    while (p0 < plain.length) {
      let len = 0;
      for (let l = Math.min(6, plain.length - p0); l >= 1; l--) if (SYL.has(plain.slice(p0, p0 + l))) { len = l; break; }
      if (!len) { fullyPinyin = false; break; }
      p0 += len;
    }
    if (allUpper || !fullyPinyin) { i = j; continue; }
    let p = 0;
    while (p < word.length) {
      let len = 0;
      for (let l = Math.min(6, word.length - p); l >= 1; l--) if (SYL.has(plain.slice(p, p + l))) { len = l; break; }
      if (!len) len = 1;
      out.push(word.slice(p, p + len));
      p += len;
    }
    i = j;
  }
  return out;
}

export type CharPy = { ch: string; py?: string };
/** 한자별 병음 정렬. 음절 수가 한자 수와 다르면 null (호출부는 줄 단위 병음으로 폴백) */
export function alignChars(zh: string, pinyin: string): CharPy[] | null {
  const chars = [...zh];
  const han = chars.filter(isHan).length;
  let syl = splitSyllables(pinyin);
  if (syl.length > han) { // 병음엔 erhua(r)가 있지만 한자엔 儿 이 없는 경우: r 을 앞 음절에 붙인다
    const m: string[] = [];
    for (const x of syl) { if (/^r$/i.test(x) && m.length) m[m.length - 1] += x; else m.push(x); }
    syl = m;
  }
  if (!han || syl.length !== han) return null;
  let k = 0;
  return chars.map((ch) => (isHan(ch) ? { ch, py: syl[k++] } : { ch }));
}
export { isHan };

const NUM = new Set('零一二三四五六七八九十百千万两几'.split(''));
const MEASURE = new Set('点个位岁天年月号日时分秒次遍件张支只条双间部款台辆本杯碗瓶斤米元块毛科门路楼层节里'.split(''));

/** 병음 띄어쓰기 + 숫자·양사 병합으로 각 단어의 끝 인덱스(배타)를 반환 */
export function wordEnds(zh: string, pinyin: string): number[] {
  const chars = [...zh];
  const words: { zh: string; end: number }[] = [];
  let hi = 0;
  for (const tok of pinyin.trim().split(/\s+/).filter(Boolean)) {
    const syl = splitSyllables(tok);
    if (!syl.length) continue;
    let w = '';
    let taken = 0;
    while (hi < chars.length && taken < syl.length) {
      const c = chars[hi];
      if (isHan(c)) { w += c; taken++; }
      hi++;
    }
    if (w) words.push({ zh: w, end: hi });
  }
  // 연속 숫자 병합 (二零零五 → 한 덩어리)
  const merged: { zh: string; end: number }[] = [];
  for (const w of words) {
    const isNum = [...w.zh].every(c => NUM.has(c));
    if (isNum && merged.length && [...merged[merged.length - 1].zh].every(c => NUM.has(c))) {
      const prev = merged[merged.length - 1];
      prev.zh += w.zh;
      prev.end = w.end;
    } else {
      merged.push({ zh: w.zh, end: w.end });
    }
  }
  // 숫자 + 양사 병합 (九+点 → 九点)
  const ends: number[] = [];
  for (let i = 0; i < merged.length; i++) {
    const w = merged[i];
    const isNum = [...w.zh].every(c => NUM.has(c));
    if (isNum && i + 1 < merged.length) {
      const n = merged[i + 1];
      const isMeasure = [...n.zh].length <= 2 && [...n.zh].every(c => MEASURE.has(c));
      if (isMeasure) { ends.push(n.end); i++; continue; }
    }
    ends.push(w.end);
  }
  return ends;
}

/** 교재의 의미 단위 끝 위치(배타)를 화면의 / 표시 위치로 바꾼다. */
export function breakPositions(zh: string, ends: number[]): Set<number> {
  const set = new Set<number>();
  const chars = [...zh];
  for (const e of ends) if (e > 0 && e < chars.length) set.add(e - 1);
  return set;
}
