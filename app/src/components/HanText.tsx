import { alignChars } from '../lib/pinyin';
import { useWordSheet } from '../stores/useWordSheet';

/** 한자 본문. 글자를 탭하면 단어장 시트가 열리고, pinyin=true 면 글자 위에 병음(ruby)을 단다. */
export default function HanText({ zh, pinyin, ruby, className }: { zh: string; pinyin: string; ruby: boolean; className?: string }) {
  const open = useWordSheet((s) => s.open);
  const aligned = alignChars(zh, pinyin);
  const chars = aligned ?? [...zh].map((ch) => ({ ch } as { ch: string; py?: string }));
  return (
    <span className={className}>
      {chars.map((c, i) => {
        const han = /[一-鿿㐀-䶿]/.test(c.ch);
        if (!han) return <span key={i}>{c.ch}</span>;
        return (
          <ruby
            key={i}
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
        );
      })}
    </span>
  );
}
