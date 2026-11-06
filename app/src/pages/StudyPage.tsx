import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadMeta } from '../lib/contentLoader';
import { recommendLesson } from '../lib/recommend';
import { isUnlocked, useProgressStore } from '../stores/useProgressStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import Icon from '../components/Icon';
import LessonSelect from '../components/LessonSelect';
import { Toggle } from '../components/ui';
import type { LessonMeta } from '../types/lesson';

const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center gap-3 p-4';

/** 학습 메뉴: 10분 데일리 · 편하게 듣기 · 마스터리 정밀 학습 */
export default function StudyPage() {
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const prog = useProgressStore();
  const level = useSettingsStore((s) => s.level);
  const { koVoice, setKoVoice } = useSettingsStore();
  useEffect(() => { void loadMeta().then(setMeta); }, []);
  const rec = recommendLesson(meta, prog, level);
  const unlocked = meta.filter((m) => isUnlocked(prog, m.id)).length;
  const [params] = useSearchParams();
  const [pick, setPick] = useState<string | null>(params.get('id'));
  const sel = pick ?? rec?.id ?? null;

  return (
    <main className="p-4 pb-28 space-y-3">
      <h1 className="text-xl font-bold">학습</h1>
      <p className="text-sm text-slate-600">소리 중심으로 익히는 세 가지 방법이에요. 아래에서 과를 고르면 10분 데일리와 마스터리에 적용돼요.</p>
      <LessonSelect label="학습할 과" metas={meta} value={sel} onChange={setPick} recId={rec?.id} isDone={(id) => isUnlocked(prog, id)} />

      <Link to={sel ? `/daily?id=${sel}` : '/daily'} className={card}>
        <Icon name="timer" size={26} className="text-brand flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block">10분 데일리</b>
          <span className="block text-xs text-slate-500">6단계 타이머로 한 과를 집중해서 듣고 따라 해요.</span>
        </span>
        <Icon name="arrowRight" size={18} className="text-slate-400" />
      </Link>

      <Link to={sel ? `/lesson/${sel}/mastery` : '/path'} className={card}>
        <Icon name="target" size={26} className="text-brand flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block">마스터리 정밀 학습</b>
          <span className="block text-xs text-slate-500">블라인드 → 스크립트 → 쉐도잉 → 최종 점검 4단계. 달성하면 해금돼요.</span>
        </span>
        <Icon name="arrowRight" size={18} className="text-slate-400" />
      </Link>

      <Link to="/passive" className={card}>
        <Icon name="headphones" size={26} className="text-brand flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block">편하게 듣기</b>
          <span className="block text-xs text-slate-500">해금한 과를 배경으로 반복 재생해요. (해금 {unlocked}과)</span>
        </span>
        <Icon name="arrowRight" size={18} className="text-slate-400" />
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
        <span className="min-w-0">
          <b className="block">한글 음성</b>
          <span className="block text-xs text-slate-500">세 학습에서 중국어 뒤에 한글 번역을 읽어 줘요.</span>
        </span>
        <Toggle label="한글 음성" on={koVoice} onClick={() => setKoVoice(!koVoice)} />
      </div>
      
    </main>
  );
}
