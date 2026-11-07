import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadMeta, loadVol, LEVEL_NAMES } from '../lib/contentLoader';
import { dayIndex, recommendLesson } from '../lib/recommend';
import { speak } from '../lib/tts';
import { useHighlightStore } from '../stores/useHighlightStore';
import type { Verse } from '../types/lesson';
import { isInAppBrowser, isIOS, isStandalone } from '../lib/inapp';
import { calcStreak, isUnlocked, useProgressStore } from '../stores/useProgressStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import type { LessonMeta } from '../types/lesson';
import Icon from '../components/Icon';
import InviteQrModal from '../components/InviteQrModal';
import { isBasicMode } from '../lib/compatibility';

const LEVEL_ICONS = ['sprout', 'layers', 'mountain', 'award'];
const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

export default function HomePage() {
  const basic = isBasicMode();
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);
  const appUrl = window.location.origin + import.meta.env.BASE_URL;
  const prog = useProgressStore();
  const { done, last } = prog;
  const level = useSettingsStore((s) => s.level);
  const marks = useHighlightStore((s) => s.marks);
  const [sod, setSod] = useState<{ verse: Verse; title: string } | null>(null);
  useEffect(() => {
    loadMeta().then(setMeta);
  }, []);
  useEffect(() => {
    // 오늘의 한 마디: 날짜 기준 고정 선택 (선택 레벨의 첫 권)
    void loadVol(level * 2 - 1).then((ls) => {
      const l = ls[dayIndex(ls.length)];
      const v = l?.text[dayIndex(l.text.length)];
      if (l && v) setSod({ verse: v, title: `Vol.${l.vol} · ${l.no}과 ${l.titleZh}` });
    }).catch(() => undefined);
  }, [level]);
  const streak = calcStreak(prog.days);
  const rec = recommendLesson(meta, prog, level);
  const unlockedCount = basic ? meta.length : meta.filter((m) => isUnlocked(prog, m.id)).length;
  const mv = Object.values(marks);
  const cnt = { green: mv.filter((c) => c === 'green').length, yellow: mv.filter((c) => c === 'yellow').length, red: mv.filter((c) => c === 'red').length };
  const sum = cnt.green + cnt.yellow + cnt.red;
  const rate = (n: number) => (sum ? Math.round((n / sum) * 100) : 0);
  const lv = meta.filter((m) => m.level === level);
  const doneCount = lv.filter((m) => done[m.id]).length;
  const inApp = isInAppBrowser();
  const next = meta.find((m) => m.id === last) ?? lv.find((m) => !done[m.id]) ?? lv[0];
  const lastLesson = meta.find((m) => m.id === last);
  const pct = lv.length ? Math.round((doneCount / lv.length) * 100) : 0;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split('#')[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  return (
    <main className="p-4 space-y-4">
      {inApp.kind && (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
          <p className="font-bold inline-flex items-center gap-1.5"><Icon name="alert" size={16} /> {inApp.label} 안의 브라우저로 열렸어요</p>
          <p className="text-slate-700">음성 재생과 설치가 제한될 수 있어요. 주소를 복사해 Chrome 또는 Safari에서 열어 주세요.</p>
          <button type="button" onClick={() => void copyUrl()} className="rounded-full bg-brand text-white text-sm font-semibold px-3 py-1.5">
            {copied ? '복사했어요' : '주소 복사'}
          </button>
        </div>
      )}

      {!isStandalone() && !inApp.kind && (
        <Link to="/help" className={`${card} flex items-center gap-3 p-3 text-sm`}>
          <Icon name="download" size={20} className="text-brand flex-none" />
          <span className="flex-1">
            <b>앱으로 설치하세요.</b>{' '}
            <span className="text-slate-500">{isIOS() ? 'Safari 공유 → 홈 화면에 추가' : '브라우저 메뉴 → 홈 화면에 추가'}</span>
          </span>
          <Icon name="chevronRight" size={16} className="text-slate-400" />
        </Link>
      )}

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 text-brand text-sm font-semibold px-3 py-1" aria-label={`연속 학습 ${streak}일`}>
          <Icon name="flame" size={16} /> 연속 학습 {streak}일
        </span>
      </div>

      <section className="rounded-2xl bg-brand text-white p-5 shadow-sm">
        <p className="text-xs opacity-80">중국어 구조화 듣기</p>
        <h1 className="text-2xl font-extrabold mt-0.5">소리로 배우는 중국어</h1>
        <p className="text-sm opacity-90 mt-1">문장의 의미 단위를 확인하고, 한자·병음·한글을 켜고 끄며 듣고 따라 말하세요.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to={next ? `/lesson/${next.id}` : '/path'} className="inline-flex items-center gap-1.5 rounded-full bg-white text-brand font-semibold text-sm px-4 py-2">
            <Icon name="speaker" size={16} /> 이어서 학습 <Icon name="arrowRight" size={14} />
          </Link>
          <Link to="/path" className="inline-flex items-center gap-1.5 rounded-full border border-white/60 text-white font-semibold text-sm px-4 py-2">
            <Icon name="map" size={16} /> 학습 경로
          </Link>
          <button type="button" onClick={() => setQr(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 text-white font-semibold text-sm px-4 py-2 sm:ml-auto">
            <Icon name="qr" size={16} /> QR 코드
          </button>
        </div>
      </section>

      {sod && (
        <section className={`${card} p-4`} aria-label="오늘의 한 마디">
          <div className="text-xs text-slate-500">오늘의 한 마디 · {sod.title}</div>
          <div className="flex items-start gap-3 mt-1">
            <div className="flex-1 min-w-0">
              <div lang="zh-Hans" className="reading-zh">{sod.verse.zh}</div>
              <div lang="zh-Latn-pinyin" className="reading-pinyin">{sod.verse.pinyin}</div>
              <div className="text-sm">{sod.verse.ko}</div>
            </div>
            <button type="button" aria-label="오늘의 한 마디 듣기" onClick={() => void speak(sod.verse.zh)} className="flex-none w-10 h-10 rounded-full bg-brand text-white grid place-items-center">
              <Icon name="speaker" size={18} />
            </button>
          </div>
        </section>
      )}

      <Link to={basic ? (rec ? `/lesson/${rec.id}` : '/path') : (rec ? `/daily?id=${rec.id}` : '/daily')} className={`${card} flex items-center gap-3 p-4`}>
        <Icon name="timer" size={24} className="text-brand flex-none" />
        <span className="flex-1 min-w-0">
          <b className="block">{basic ? '오늘의 기본 학습' : '오늘의 10분 데일리'}</b>
          <span className="block text-sm text-slate-500 truncate">{rec ? `추천: Vol.${rec.vol} · ${rec.no}과 · ${rec.titleZh}` : '불러오는 중…'}</span>
        </span>
        <Icon name="chevronRight" size={16} className="text-slate-400" />
      </Link>

      {lastLesson && (
        <Link to={`/lesson/${lastLesson.id}${basic ? '' : '/mastery'}`} className={`${card} flex items-center gap-3 p-4`}>
          <Icon name="target" size={24} className="text-brand flex-none" />
          <span className="flex-1 min-w-0">
            <b className="block">{basic ? '이어 학습하기 (교재)' : '이어 학습하기 (마스터리)'}</b>
            <span className="block text-sm text-slate-500 truncate">{lastLesson.no}. {lastLesson.titleZh} · {lastLesson.titleKo}</span>
          </span>
          <Icon name="chevronRight" size={16} className="text-slate-400" />
        </Link>
      )}

      <section className={`${card} p-4`} aria-label="이해도 달성률">
        <h2 className="font-bold">이해도 달성률</h2>
        {sum === 0 ? (
          <p className="text-sm text-slate-500 mt-1">본문 카드의 동그라미를 눌러 이해도를 표시해 보세요. 초록 → 노랑 → 빨강 순서로 바뀝니다.</p>
        ) : (
          <>
            <div className="flex h-2.5 rounded-full overflow-hidden mt-2 bg-slate-200" role="img" aria-label={`초록 ${rate(cnt.green)}%, 노랑 ${rate(cnt.yellow)}%, 빨강 ${rate(cnt.red)}%`}>
              <div className="bg-green-600" style={{ width: `${rate(cnt.green)}%` }} />
              <div className="bg-yellow-500" style={{ width: `${rate(cnt.yellow)}%` }} />
              <div className="bg-red-600" style={{ width: `${rate(cnt.red)}%` }} />
            </div>
            <div className="flex gap-4 text-sm mt-2">
              <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-600 mr-1" />바로 이해 {rate(cnt.green)}%</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500 mr-1" />헷갈림 {rate(cnt.yellow)}%</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 mr-1" />생소 {rate(cnt.red)}%</span>
            </div>
          </>
        )}
      </section>

      <section className={`${card} p-4`}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-bold">학습 진도</h2>
          <span className="text-sm text-slate-500">{doneCount}/{lv.length} 과 ({pct}%)</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 mt-2 overflow-hidden">
          <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          {LEVEL_NAMES[level]}
          {lastLesson && (
            <> · 최근: <Link to={`/lesson/${lastLesson.id}`} className="text-brand underline">{lastLesson.titleZh} · {lastLesson.titleKo}</Link></>
          )}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((n) => {
          const all = meta.filter((m) => m.level === n);
          const d = all.filter((m) => done[m.id]).length;
          const [no, ...rest] = LEVEL_NAMES[n].split(' ');
          return (
            <Link key={n} to={`/path?lv=${n}`} className={`${card} py-4 px-3 text-center`}>
              <Icon name={LEVEL_ICONS[n - 1]} size={24} className="mx-auto mb-1 text-brand" />
              <div className="font-bold">{no}</div>
              <div className="text-xs text-slate-500 leading-snug">{rest.join(' ')}</div>
              <div className="text-xs text-slate-400 mt-0.5">{d}/{all.length || 40}과</div>
            </Link>
          );
        })}
      </div>
      <Link to="/passive" className={`${card} flex items-center gap-3 p-4`}>
        <Icon name="headphones" size={24} className="text-brand flex-none" />
        <span className="flex-1"><b className="block">편하게 듣기</b><span className="text-sm text-slate-500">{basic ? '바로 듣기' : '해금된 음원'} {unlockedCount}과</span></span>
        <Icon name="chevronRight" size={16} className="text-slate-400" />
      </Link>
      {qr && <InviteQrModal url={appUrl} onClose={() => setQr(false)} />}
    </main>
  );
}
