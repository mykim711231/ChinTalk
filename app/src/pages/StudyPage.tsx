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
import { useStudySource } from '../hooks/useStudySource';
import StudySourceSelector from '../components/StudySourceSelector';
import { studySourceLabel } from '../lib/studyContent';

const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center gap-3 p-4';

/** 학습 메뉴: 10분 데일리 · 편하게 듣기 · 마스터리 정밀 학습 */
export default function StudyPage() {
  const { source, setSource } = useStudySource();
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
      <p className="text-sm text-slate-600">학습 대상을 고르면 10분 데일리·마스터리·편하게 듣기에 같은 선택이 적용돼요.</p>
      <StudySourceSelector value={source} onChange={setSource} />
      <LessonSelect label="학습할 과" metas={meta} value={sel} onChange={setPick} recId={rec?.id} isDone={(id) => isUnlocked(prog, id)} />

      <Link to={`/daily?source=${source}${sel ? `&id=${sel}` : ''}`} className={card}>
        <Icon name="timer" size={26} className="text-brand flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block">10분 데일리</b>
          <span className="block text-xs text-slate-500">{studySourceLabel(source)} · 6단계 타이머로 듣고 따라 해요.</span>
        </span>
        <Icon name="arrowRight" size={18} className="text-slate-400" />
      </Link>

      <Link to={sel ? `/lesson/${sel}/mastery?source=${source}` : '/path'} className={card}>
        <Icon name="target" size={26} className="text-brand flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block">마스터리 정밀 학습</b>
          <span className="block text-xs text-slate-500">{studySourceLabel(source)} · 블라인드 → 스크립트 → 쉐도잉 → 최종 점검으로 학습해요.</span>
        </span>
        <Icon name="arrowRight" size={18} className="text-slate-400" />
      </Link>

      <Link to={`/passive?source=${source}`} className={card}>
        <Icon name="headphones" size={26} className="text-brand flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block">편하게 듣기</b>
          <span className="block text-xs text-slate-500">{studySourceLabel(source)} · 마스터리·데일리를 마친 과를 반복해 들어요. (해금 {unlocked}과)</span>
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
