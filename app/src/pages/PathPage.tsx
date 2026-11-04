import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadMeta, LEVEL_NAMES } from '../lib/contentLoader';
import { useProgressStore } from '../stores/useProgressStore';
import Icon from '../components/Icon';
import type { LessonMeta } from '../types/lesson';

const VOL_NAMES = [
  '기초 일상', '생활 회화', '여행 회화', '비즈니스 회화',
  '고급·실무 회화', '네이티브 표현', '의사소통 기능', '시사·논증',
];

export default function PathPage() {
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const [sp] = useSearchParams();
  const lvParam = Number(sp.get('lv'));
  const [open, setOpen] = useState<number>(lvParam >= 1 && lvParam <= 4 ? lvParam * 2 - 1 : 1);
  const done = useProgressStore((s) => s.done);
  useEffect(() => {
    loadMeta().then(setMeta);
  }, []);
  useEffect(() => {
    if (lvParam >= 1 && lvParam <= 4) document.getElementById(`lv${lvParam}`)?.scrollIntoView();
  }, [lvParam, meta.length]);
  return (
    <main className="p-4">
      <h1 className="text-xl font-bold mb-3">학습 경로</h1>
      {[1, 2, 3, 4].map((lv) => (
        <section key={lv} id={`lv${lv}`} className="mb-4 scroll-mt-16">
          <h2 className="font-semibold text-brand mb-2">{LEVEL_NAMES[lv]}</h2>
          {[lv * 2 - 1, lv * 2].map((vol) => {
            const ls = meta.filter((m) => m.vol === vol);
            const n = ls.filter((l) => done[l.id]).length;
            return (
              <div key={vol} className="border border-slate-200 rounded-xl mb-2">
                <button
                  className="w-full text-left p-3 flex justify-between"
                  onClick={() => setOpen(open === vol ? 0 : vol)}
                >
                  <span>
                    vol{vol} · {VOL_NAMES[vol - 1]}
                  </span>
                  <span className="text-sm text-slate-500">{n}/20</span>
                </button>
                {open === vol && (
                  <ul className="px-3 pb-3 grid gap-1">
                    {ls.map((l) => (
                      <li key={l.id}>
                        <Link
                          to={`/lesson/${l.id}`}
                          className="flex justify-between rounded-lg px-2 py-2 hover:bg-slate-50"
                        >
                          <span>
                            {l.no}. {l.titleZh} <span className="text-slate-500 text-sm">{l.titleKo}</span>
                          </span>
                          <span className="text-brand">{done[l.id] ? <Icon name="check-circle" size={18} /> : null}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
