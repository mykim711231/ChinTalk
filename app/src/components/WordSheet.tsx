import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { lookup, type Hit } from '../lib/dict';
import { speak } from '../lib/tts';
import { useWordSheet } from '../stores/useWordSheet';
import Icon from './Icon';

/** 글자 탭 → 단어장 바텀시트 */
export default function WordSheet() {
  const { target, close } = useWordSheet();
  const [hits, setHits] = useState<Hit[] | null>(null);

  useEffect(() => {
    setHits(null);
    if (!target) return;
    let off = false;
    void lookup(target.zh, target.idx).then((h) => { if (!off) setHits(h); });
    return () => { off = true; };
  }, [target]);
  useEffect(() => {
    if (!target) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [target, close]);

  if (!target) return null;
  const ch = [...target.zh][target.idx];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label="단어장" onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 space-y-3">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="글자 듣기" onClick={() => speak(ch)} className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center">
            <Icon name="speaker" size={18} />
          </button>
          <div className="flex-1 min-w-0"><span lang="zh-Hans" className="font-hanzi text-3xl">{ch}</span> <span lang="zh-Latn-pinyin" className="reading-pinyin">{target.py}</span></div>
          <button type="button" aria-label="닫기" onClick={close} className="w-9 h-9 text-slate-500 text-xl leading-none">×</button>
        </div>
        {hits === null && <p className="text-sm text-slate-500">찾는 중…</p>}
        {hits?.length === 0 && <p className="text-sm text-slate-500">이 글자가 들어간 단어가 단어장에 아직 없어요.</p>}
        {hits?.map(({ word, entry }) => {
          const meanings = entry.senses?.length ? entry.senses : (entry.ko ? [entry.ko] : []);
          return (
          <div key={word} className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" aria-label={`${word} 듣기`} onClick={() => speak(word)} className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center">
                <Icon name="speaker" size={14} />
              </button>
              <span lang="zh-Hans" className="reading-zh">{word}</span>
              <span lang="zh-Latn-pinyin" className="reading-pinyin">{entry.p}</span>
              {entry.pos && <span className="text-xs text-slate-500">· {entry.pos}</span>}
            </div>
            {meanings.length ? (
              <>
                <p className="mt-1 text-sm text-slate-800 font-medium">{meanings[0]}</p>
                {meanings.length > 1 && (
                  <details className="mt-1">
                    <summary className="text-xs text-slate-500 cursor-pointer select-none">+ 다른 뜻 {meanings.length - 1}개</summary>
                    <ol className="mt-1 space-y-0.5 text-sm text-slate-700 list-decimal list-inside">
                      {meanings.slice(1).map((m, i) => <li key={i}>{m}</li>)}
                    </ol>
                  </details>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-500">뜻 준비 중이에요 — 병음으로 발음을 확인해 보세요.</p>
            )}
            {entry.h && <p className="mt-1 text-xs text-slate-500">{entry.h}</p>}
            {entry.ex && (
              <p className="mt-1 text-xs text-slate-600">
                <span lang="zh-Hans" className="font-hanzi text-xl leading-relaxed">{entry.ex[0]}</span> <span lang="zh-Latn-pinyin" className="reading-pinyin">{entry.ex[1]}</span> — {entry.ex[2]}
              </p>
            )}
            <Link to={`/lesson/${entry.l}`} onClick={close} className="mt-1 inline-block text-xs text-brand underline">{entry.l} 과에서 보기</Link>
          </div>
          );
        })}
      </div>
    </div>
  );
}
