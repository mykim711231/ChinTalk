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
import { studySourceLabel } from '../lib/studyContent';
import { isBasicMode } from '../lib/compatibility';
import { dueCards, useReviewStore } from '../stores/useReviewStore';

const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center gap-3 p-4';

/** 학습 메뉴: 10분 데일리 · 편하게 듣기 · 심화 학습 · 심화 학습 복습 */
export default function StudyPage() {
  const basic = isBasicMode();
  const { source } = useStudySource();
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const prog = useProgressStore();
  const reviewCards = useReviewStore((s) => s.cards);
  const dueCount = dueCards(reviewCards).length;
  const level = useSettingsStore((s) => s.level);
  const { koVoice, setKoVoice } = useSettingsStore();
  useEffect(() => { void loadMeta().then(setMeta); }, []);
  const rec = recommendLesson(meta, prog, level);
  const unlocked = basic ? meta.length : meta.filter((m) => isUnlocked(prog, m.id)).length;
  const [params] = useSearchParams();
  const [pick, setPick] = useState<string | null>(params.get('id'));
  const sel = pick ?? rec?.id ?? null;

  return (
    <main className="p-4 pb-28 space-y-3">
      <h1 className="text-xl font-bold">학습</h1>
      <p className="text-sm text-slate-600">{basic ? '교재에서 본문·단어·문법·회화를 읽고, 편하게 듣기에서 학습 대상을 골라 들을 수 있어요.' : '학습할 과를 고르고 원하는 학습을 시작하세요. 학습 대상(본문/회화)은 각 학습 화면에서 고를 수 있어요.'}</p>
      <LessonSelect label="학습할 과" metas={meta} value={sel} onChange={setPick} recId={rec?.id} isDone={basic ? undefined : (id) => isUnlocked(prog, id)} />

      {basic ? (
        <Link to={sel ? `/lesson/${sel}` : '/path'} className={card}>
          <Icon name="map" size={26} className="text-brand flex-none" />
          <span className="min-w-0 flex-1"><b className="block">교재 학습</b><span className="block text-xs text-slate-500">본문·단어·문법·회화·발음 함정과 전체 듣기</span></span>
          <Icon name="arrowRight" size={18} className="text-slate-400" />
        </Link>
      ) : <>
      <Link to={`/daily?source=${source}${sel ? `&id=${sel}` : ''}`} className={card}>
        <Icon name="timer" size={26} className="text-brand flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block">10분 데일리</b>
          <span className="block text-xs text-slate-500">{studySourceLabel(source)} · 6단계 타이머로 듣고 따라 해요.</span>
        </span>
        <Icon name="arrowRight" size={18} className="text-slate-400" />
      </Link>

      <Link to={sel ? `/lesson/${sel}/mastery` : '/path'} className={card}>
        <Icon name="target" size={26} className="text-brand flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block">심화 학습</b>
          <span className="block text-xs text-slate-500">본문+회화 · 듣고 이해 → 보고 떠올리기(한글/간체) → 따라 말하기로 깊이 익혀요.</span>
        </span>
        <Icon name="arrowRight" size={18} className="text-slate-400" />
      </Link>

      <Link to="/review" className={card}>
        <Icon name="repeat" size={26} className="text-brand flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block">심화 학습 복습{dueCount ? ` (${dueCount}장)` : ''}</b>
          <span className="block text-xs text-slate-500">{dueCount ? '심화 학습에서 못한 문장을 다시 확인해요.' : '못한 문장이 생기면 여기서 언제든 복습해요.'}</span>
        </span>
        <Icon name="arrowRight" size={18} className="text-slate-400" />
      </Link>

      </>}
      <Link to={`/passive?source=${source}`} className={card}>
        <Icon name="headphones" size={26} className="text-brand flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block">편하게 듣기</b>
          <span className="block text-xs text-slate-500">{studySourceLabel(source)} · {basic ? `전체 ${unlocked}과를 바로 들어요.` : `심화 학습·데일리를 마친 과를 반복해 들어요. (해금 ${unlocked}과)`}</span>
        </span>
        <Icon name="arrowRight" size={18} className="text-slate-400" />
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
        <span className="min-w-0">
          <b className="block">한글 음성</b>
          <span className="block text-xs text-slate-500">{basic ? '편하게 듣기에서' : '세 학습에서'} 중국어 뒤에 한글 번역을 읽어 줘요.</span>
        </span>
        <Toggle label="한글 음성" on={koVoice} onClick={() => setKoVoice(!koVoice)} />
      </div>
      
    </main>
  );
}
