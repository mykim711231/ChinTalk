import { reviewedMeaningUnits } from './meaning-overrides';

export type TaggedWord = { word: string; tag: string };
type Token = TaggedWord & { start: number; end: number };
type Atom = { start: number; end: number; size: number; kind: string };
const reviewed = new Map(reviewedMeaningUnits.map((text) => [text.replace(/／/g, ''), text]));
const NOUN = /^(n|r|m|q|s|f|eng)/;
const VERB = /^v/;
const ADJ = /^(a|b)/;
const PERSONAL = /^(我|你|您|他|她|它|我们|你们|他们|她们|大家)$/;
const PREP = new Set(['在', '从', '到', '对', '向', '给', '跟', '和', '为', '把', '被', '将', '关于', '对于', '通过', '根据', '按照', '随着', '离', '往', '比', '去', '来']);
const PREFIX = new Set(['不', '没', '没有', '别', '很', '非常', '太', '更', '最', '多', '也', '都', '就', '还', '已经', '正在', '在', '基本', '大量', '先', '再', '能', '能够', '会', '可以', '要', '应该', '必须', '可能', '想', '想要', '打算', '准备', '需要', '开始', '继续', '去', '来']);
const PARTICLE = /^(吗|呢|吧|啊|呀|嘛|哦|了|着|过)$/;
const RESULT = /^(完|好|到|懂|见|会|开|住|清楚|明白|错|对|成|掉|动|满|断|坏|起来|下来|下去|上来|出去|出来|回来|进去|一下|一遍|一次)$/;
const COPULA = /^(是|不是|就是|也是|都是|叫|姓)$/;
const CLOSE = /^[，。！？、；：,.!?;:…—”’）)】》」』]+$/;
const OPEN = /^[“‘（(【《「『]+$/;
const isNoun = (t?: Token) => !!t && (NOUN.test(t.tag) || (!t.tag && /[一-鿿]/.test(t.word))) && !PREFIX.has(t.word);
const isPredicate = (t?: Token) => !!t && (VERB.test(t.tag) || ADJ.test(t.tag) || PREFIX.has(t.word));

function markedEnds(marked: string): number[] {
  let end = 0;
  return marked.split('／').map((part) => {
    if (!part) throw new Error(`Empty meaning unit: ${marked}`);
    end += [...part].length;
    return end;
  });
}

/** 원문을 바꾸지 않는 표시용 경계. 교재 지정 > 검토한 문장 > 문법·길이 기반 묶음. */
export function meaningUnitEnds(zh: string, words: TaggedWord[], marked?: string): number[] {
  if (marked?.includes('／')) {
    if (marked.replace(/／/g, '') !== zh) throw new Error('Meaning units do not match source');
    return markedEnds(marked);
  }
  const exact = reviewed.get(zh);
  if (exact) return markedEnds(exact);
  if (!zh) return [];
  const tokens: Token[] = [];
  let end = 0;
  for (const word of words) {
    const start = end;
    end += [...word.word].length;
    tokens.push({ ...word, start, end });
  }
  if (words.map((t) => t.word).join('') !== zh) throw new Error(`Token alignment failed: ${zh}`);

  // 영문·숫자·이메일과 짧은 인용 표현 안에는 경계를 넣지 않는다.
  const protectedRanges = [...zh.matchAll(/[\w.+-]+@[\w.-]+|https?:\/\/[^\s，。！？；]+|[A-Za-z]+(?:[-_][A-Za-z\d]+)*|(?:[零一二三四五六七八九十百千万两\d]+[年月日号点时分秒岁])+(?:以前|以后|之前|之后|左右)?|\d+(?:\.\d+)*|"[^"，。！？；]{1,12}"|“[^”，。！？；]{1,12}”/g)]
    .map((m) => ({ start: [...zh.slice(0, m.index)].length, end: [...zh.slice(0, m.index! + m[0].length)].length }));
  const result: number[] = [];
  let start = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!/^[，。！？；：,.!?;:]+$/.test(t.word) || protectedRanges.some((r) => t.start >= r.start && t.start < r.end)) continue;
    let last = i;
    while (last + 1 < tokens.length && CLOSE.test(tokens[last + 1].word)) last++;
    result.push(...clauseEnds(zh, tokens.slice(start, last + 1), protectedRanges));
    start = last + 1;
    i = last;
  }
  if (start < tokens.length) result.push(...clauseEnds(zh, tokens.slice(start), protectedRanges));
  return result;
}

function clauseEnds(zh: string, tokens: Token[], ranges: { start: number; end: number }[]): number[] {
  const text = tokens.map((t) => t.word).join('');
  const reviewedClause = reviewed.get(text);
  if (reviewedClause) return markedEnds(reviewedClause).map((e) => e + tokens[0].start);
  const n = tokens.length;
  const tight = Array<boolean>(n - 1).fill(false);
  const forced = new Set<number>();
  const bind = (first: number, last: number) => { for (let i = Math.max(0, first); i < Math.min(n - 1, last); i++) tight[i] = true; };
  const nounEnd = (first: number) => {
    let last = first;
    while (last + 1 < n) {
      const next = tokens[last + 1];
      if (ADJ.test(next.tag) && (isNoun(tokens[last + 2])
        || /^(m|q)$/.test(tokens[first].tag) && !!tokens[last + 2] && VERB.test(tokens[last + 2].tag))) { last += 2; continue; }
      if ((isNoun(next) && !PERSONAL.test(next.word)) || ((ADJ.test(next.tag) || /^(的|和|与|及|、)$/.test(next.word)) && isNoun(tokens[last + 2]))) last++;
      else break;
    }
    return last;
  };
  for (const r of ranges) {
    for (let i = 0; i < n - 1; i++) if (tokens[i].end > r.start && tokens[i].end < r.end) tight[i] = true;
  }
  for (let i = 0; i < n; i++) {
    const t = tokens[i], next = tokens[i + 1], previous = tokens[i - 1];
    if (CLOSE.test(t.word) || /^\s+$/.test(t.word)) bind(i - 1, i);
    if (OPEN.test(t.word)) bind(i, i + 1);
    if (isNoun(t) || (ADJ.test(t.tag) && (isNoun(next) || next?.word === '的'))) bind(i, nounEnd(i));
    if (t.word === '的' && previous && next) {
      let modifier = i - 1;
      // 수식절은 '的+명사'까지 함께 보호해 '新 / 开的饭店'처럼 갈라지지 않게 한다.
      while (modifier > 0 && tight[modifier - 1]) modifier--;
      if (VERB.test(previous.tag) || tokens.slice(modifier, i).some((x) => VERB.test(x.tag))) {
        while (modifier > 0 && (ADJ.test(tokens[modifier - 1].tag) || PREFIX.has(tokens[modifier - 1].word)
          || isNoun(tokens[modifier - 1]) && /^(这|那|一|两|几|每|我|你|他|她)/.test(tokens[modifier - 1].word))) modifier--;
      }
      while (modifier > 0 && /^(m|q)$/.test(tokens[modifier - 1].tag)) modifier--;
      bind(modifier, nounEnd(i + 1));
    }
    if (PREP.has(t.word) && next && (isNoun(next) || ADJ.test(next.tag))) bind(i, nounEnd(i + 1));
    if (VERB.test(t.tag) && /[在给向]$/.test(t.word) && isNoun(next)) bind(i, nounEnd(i + 1));
    if ((t.tag === 'd' || PREFIX.has(t.word)) && isPredicate(next)) bind(i, i + 1);
    if (ADJ.test(t.tag) && next && VERB.test(next.tag)) bind(i, i + 1);
    if (PERSONAL.test(t.word) && next && (PREFIX.has(next.word) || PREP.has(next.word))) bind(i, i + 1);
    if (PARTICLE.test(t.word) && previous) bind(i - 1, i);
    if (RESULT.test(t.word) && previous && VERB.test(previous.tag)) bind(i - 1, i);
    if (/^(起|下|上|进|出|回)$/.test(t.word) && previous && VERB.test(previous.tag)) bind(i - 1, i);
    if (/^(来|去)$/.test(t.word) && previous && /^(起|下|上|进|出|回)$/.test(previous.word)) bind(i - 1, i);
    if (t.word === '比' && next) bind(i, n - (CLOSE.test(tokens[n - 1].word) ? 2 : 1));
    if (/^(得|地)$/.test(t.word) && previous && next) {
      bind(i - 1, i + 1);
      if (PREFIX.has(next.word) && isPredicate(tokens[i + 2])) bind(i + 1, i + 2);
    }
    if (/^(请|麻烦)$/.test(t.word) && next) {
      bind(i, i + 1);
      if (PERSONAL.test(next.word) && isPredicate(tokens[i + 2])) bind(i + 1, i + 2);
    }
  }
  // 我是／韩国人、我叫／李明: 주어와 계사를 함께 읽고 뒤의 설명과 구분한다.
  for (let i = 1; i < n - 1; i++) {
    if (!COPULA.test(tokens[i].word) || !isNoun(tokens[i + 1])) continue;
    let subject = i - 1;
    while (subject > 0 && tight[subject - 1]) subject--;
    if (!tokens.slice(subject, i).some((t) => isNoun(t))) continue;
    bind(subject, i);
    tight[i] = false;
    forced.add(i);
  }

  const atoms: Atom[] = [];
  for (let i = 0; i < n;) {
    let last = i;
    while (last < n - 1 && tight[last] && !forced.has(last)) last++;
    const part = tokens.slice(i, last + 1);
    const value = part.map((t) => t.word).join('');
    const han = [...value].filter((c) => /[一-鿿㐀-䶿]/.test(c)).length;
    const kind = PREP.has(part[0].word) ? 'prep' : part.some((t) => VERB.test(t.tag) || ADJ.test(t.tag)) ? 'verb'
      : part.some((t) => t.tag === 't') ? 'time' : part.some(isNoun) ? 'noun' : 'other';
    atoms.push({ start: i, end: last, size: han || Math.max(1, Math.ceil(value.length / 3)), kind });
    i = last + 1;
  }
  const costs = Array<number>(atoms.length + 1).fill(Infinity);
  const before = Array<number>(atoms.length + 1).fill(0);
  costs[0] = 0;
  for (let to = 1; to <= atoms.length; to++) {
    let size = 0;
    for (let from = to - 1; from >= 0; from--) {
      if (from < to - 1 && forced.has(atoms[from].end)) break;
      size += atoms[from].size;
      const left = atoms[to - 1], right = atoms[to];
      let cue = 0;
      if (right) {
        if ((left.kind === 'noun' || left.kind === 'prep' || left.kind === 'time') && right.kind === 'verb') cue = 1.3;
        if (left.kind === 'verb' && right.kind === 'noun') cue = right.size >= 4 ? 1.3 : 0.15;
      }
      const rhythm = size < 3 ? (3 - size) * 2 : (size - 4) ** 2 * 0.16 + Math.max(0, size - 10) ** 2;
      const cost = costs[from] + rhythm + (right ? 0.5 - cue * 2 : 0);
      if (cost < costs[to]) { costs[to] = cost; before[to] = from; }
    }
  }
  const ends: number[] = [];
  for (let to = atoms.length; to > 0; to = before[to]) ends.unshift(tokens[atoms[to - 1].end].end);
  if (ends.some((e) => e <= 0 || e > [...zh].length)) throw new Error('Invalid meaning boundary');
  return ends;
}
