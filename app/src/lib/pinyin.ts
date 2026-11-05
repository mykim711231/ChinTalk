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
const isLetter = (c: string) => /[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ]/.test(c);

/** 병음 문자열 → 음절(성조 표기 유지) 배열 */
export function splitSyllables(pinyin: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < pinyin.length) {
    if (!isLetter(pinyin[i])) { i++; continue; }
    let j = i;
    while (j < pinyin.length && isLetter(pinyin[j])) j++;
    const word = pinyin.slice(i, j);
    const plain = [...word].map(base).join('');
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
