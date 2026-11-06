import { Fragment } from 'react';
import { alignChars, breakPositions } from '../lib/pinyin';
import { useWordSheet } from '../stores/useWordSheet';

/** 한자 본문. 글자를 탭하면 단어장 시트가 열리고, pinyin=true 면 글자 위에 병음(ruby)을 단다. */
export default function HanText({ zh, pinyin, ruby, phrases, showMeaningUnits, className, interactive = true }: { zh: string; pinyin: string; ruby: boolean; phrases?: number[]; showMeaningUnits?: boolean; className?: string; interactive?: boolean }) {
  const open = useWordSheet((s) => s.open);
  const aligned = alignChars(zh, pinyin);
  const chars = aligned ?? [...zh].map((ch) => ({ ch } as { ch: string; py?: string }));
  const groups: { ch: string; py?: string; idx: number }[][] = [];
  chars.forEach((c, idx) => {
    const previous = groups[groups.length - 1];
    // 닫는 구두점은 앞 글자와, 여는 괄호·따옴표는 뒤 글자와 함께 줄바꿈한다.
    if (previous && (/^[，。！？、；：,.!?;:…—”’）)】》」』]$/.test(c.ch)
      || previous.every(({ ch }) => /^[“‘（(【《「『]$/.test(ch)))) {
      previous.push({ ...c, idx });
    } else groups.push([{ ...c, idx }]);
  });
  const breakSet = showMeaningUnits ? breakPositions(zh, phrases ?? []) : new Set<number>();
  return (
    <span lang="zh-Hans" className={`han-text ${ruby && aligned ? 'han-text--ruby' : ''} ${className ?? ''}`}>
      {groups.map((group) => (
        <span key={group[0].idx}>
          {group.map((c) => {
            const han = /[一-鿿㐀-䶿]/.test(c.ch);
            const brk = breakSet.has(c.idx);
            return (
              <Fragment key={c.idx}>
                {han ? (
                  <ruby
                    role={interactive ? 'button' : undefined}
                    tabIndex={interactive ? 0 : undefined}
                    aria-label={interactive ? `${c.ch} ${c.py ?? ''} 단어장` : undefined}
                    onClick={interactive ? () => open({ zh, idx: c.idx, py: c.py }) : undefined}
                    onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open({ zh, idx: c.idx, py: c.py }); } } : undefined}
                    className={`han-ruby ${interactive ? 'cursor-pointer rounded hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand' : ''}`}
                  >
                    {c.ch}
                    {ruby && c.py && <rt lang="zh-Latn-pinyin">{c.py}</rt>}
                  </ruby>
                ) : (
                  <>{c.ch}</>
                )}
                {brk && <span aria-hidden className="mx-1 font-bold text-brand">/</span>}
              </Fragment>
            );
          })}
        </span>
      ))}
    </span>
  );
}
