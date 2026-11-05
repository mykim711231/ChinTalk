import { alignChars, breakPositions } from '../lib/pinyin';
import { useWordSheet } from '../stores/useWordSheet';
import type { BreakLevel } from '../stores/useSettingsStore';

/** 한자 본문. 글자를 탭하면 단어장 시트가 열리고, pinyin=true 면 글자 위에 병음(ruby)을 단다. */
export default function HanText({ zh, pinyin, ruby, words, phrases, breakLevel, className }: { zh: string; pinyin: string; ruby: boolean; words?: number[]; phrases?: number[]; breakLevel?: BreakLevel; className?: string }) {
  const open = useWordSheet((s) => s.open);
  const aligned = alignChars(zh, pinyin);
  const chars = aligned ?? [...zh].map((ch) => ({ ch } as { ch: string; py?: string }));
  const breakSet = breakLevel ? breakPositions(zh, words ?? [], phrases ?? [], breakLevel) : new Set<number>();
  return (
    <span className={className}>
      {chars.map((c, i) => {
        const han = /[一-鿿㐀-䶿]/.test(c.ch);
        const brk = breakSet.has(i);
        return (
          <span key={i}>
            {han ? (
              <ruby
                role="button"
                tabIndex={0}
                aria-label={`${c.ch} ${c.py ?? ''} 단어장`}
                onClick={() => open({ zh, idx: i, py: c.py })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open({ zh, idx: i, py: c.py }); } }}
                className="cursor-pointer rounded hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                {c.ch}
                {ruby && c.py && <rt className="text-[0.5em] leading-none text-slate-500 font-normal select-none">{c.py}</rt>}
              </ruby>
            ) : (
              <>{c.ch}</>
            )}
            {brk && <span aria-hidden className="mx-1 font-bold text-brand">/</span>}
          </span>
        );
      })}
    </span>
  );
}
