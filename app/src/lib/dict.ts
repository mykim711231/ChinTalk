// 단어장(word-dict.json): 교재 '단어'·'관련 어휘'에서 생성. 글자를 탭하면 그 글자를 포함한 가장 긴 단어를 찾는다.
export type DictEntry = { p: string; pos?: string; ko: string; h?: string; ex?: [string, string, string]; l: string };
const B = import.meta.env.BASE_URL;
let dictP: Promise<Record<string, DictEntry>> | null = null;
export const loadDict = (): Promise<Record<string, DictEntry>> =>
  (dictP ??= fetch(`${B}data/word-dict.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, DictEntry>>) : {}))
    .catch(() => ({} as Record<string, DictEntry>)));

export type Hit = { word: string; entry: DictEntry };
/** sentence 의 idx 번째 글자를 포함하는 단어들을 긴 것부터 반환 */
export async function lookup(sentence: string, idx: number): Promise<Hit[]> {
  const d = await loadDict();
  const chars = [...sentence];
  const hits: Hit[] = [];
  const seen = new Set<string>();
  for (let len = Math.min(8, chars.length); len >= 1; len--) {
    for (let s = Math.max(0, idx - len + 1); s <= idx && s + len <= chars.length; s++) {
      const w = chars.slice(s, s + len).join('');
      if (d[w] && !seen.has(w)) { seen.add(w); hits.push({ word: w, entry: d[w] }); }
    }
  }
  return hits;
}
