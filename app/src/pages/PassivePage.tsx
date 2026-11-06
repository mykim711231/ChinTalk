import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadLesson, loadMeta } from '../lib/contentLoader';
import { getPassiveAudio, playMp3Only, stopPassive } from '../lib/tts';
import { isUnlocked, useProgressStore } from '../stores/useProgressStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import Icon from '../components/Icon';
import type { LessonMeta } from '../types/lesson';

type Mode = 'one' | 'all' | 'shuffle';
const MODES: { v: Mode; l: string; icon: string }[] = [
  { v: 'one', l: '한 과 반복', icon: 'repeat' },
  { v: 'all', l: '순차', icon: 'arrowRight' },
  { v: 'shuffle', l: '랜덤', icon: 'shuffle' },
];
const btn = 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white text-sm font-semibold px-3 py-2 disabled:opacity-40';
const btnBrand = 'inline-flex items-center gap-1.5 rounded-full bg-brand text-white text-sm font-semibold px-4 py-2 disabled:opacity-40';

/** §6.8 편하게 듣기 — 해금(마스터리/데일리 완료)한 과만, mp3 전용, 잠금화면 재생 컨트롤 */
export default function PassivePage() {
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const prog = useProgressStore();
  const rate = useSettingsStore((s) => s.ttsRate);
  const [mode, setMode] = useState<Mode>('all');
  const [cur, setCur] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [vol, setVol] = useState<number | null>(null);
  const token = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => { void loadMeta().then(setMeta); }, []);
  const unlocked = meta.filter((m) => isUnlocked(prog, m.id));
  const listRef = useRef(unlocked);
  listRef.current = unlocked;

  const vols = [...new Set(meta.map((m) => m.vol))].sort((a, b) => a - b);
  const shownVol = vol ?? (unlocked[0]?.vol ?? 1);
  // 재생이 다른 vol 로 넘어가면 그 vol 을 펼치고 현재 카드로 스크롤
  useEffect(() => {
    const m = meta.find((x) => x.id === cur);
    if (m) setVol(m.vol);
  }, [cur, meta]);
  useEffect(() => {
    if (cur) document.getElementById('passive-' + cur)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [cur, vol]);

  const stop = useCallback(() => {
    token.current++;
    stopPassive();
    setPlaying(false);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }, []);

  const playFrom = useCallback(async (startId: string) => {
    const my = ++token.current;
    stopPassive();
    let id: string | null = startId;
    setPlaying(true);
    setNote(null);
    while (id && token.current === my) {
      const m = listRef.current.find((x) => x.id === id);
      const lesson = await loadLesson(id);
      if (!lesson || !m || token.current !== my) break;
      setCur(id);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: `${lesson.no}. ${lesson.titleZh}`, artist: 'ChinTalk', album: `Vol.${lesson.vol}` });
        navigator.mediaSession.playbackState = 'playing';
      }
      let played = 0;
      for (const v of lesson.text) {
        if (token.current !== my) return;
        if (await playMp3Only(v.zh, rate)) played++;
        if (token.current !== my) return;
        if (useSettingsStore.getState().koVoice) {
          await new Promise((r) => setTimeout(r, 300));
          if (token.current !== my) return;
          await playMp3Only(v.ko, 1, 'ko');
          if (token.current !== my) return;
        }
        await new Promise((r) => setTimeout(r, 700));
      }
      if (token.current !== my) return;
      if (!played) setNote('이 과는 아직 음원(mp3)이 없어 건너뛰었어요.');
      const list = listRef.current;
      const mo = modeRef.current;
      if (mo === 'one' && played) id = id;
      else if (!list.length) id = null;
      else if (mo === 'shuffle') id = list[Math.floor(Math.random() * list.length)].id;
      else id = list[(list.findIndex((x) => x.id === id) + 1) % list.length].id;
      if (list.length === 1 && !played) break; // 재생할 음원이 하나도 없으면 무한 루프 방지
    }
    if (token.current === my) setPlaying(false);
  }, [rate]);

  // 잠금화면/알림 컨트롤
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const step = (d: number) => {
      const list = listRef.current;
      if (!list.length) return;
      const i = Math.max(0, list.findIndex((x) => x.id === cur));
      void playFrom(list[(i + d + list.length) % list.length].id);
    };
    ms.setActionHandler('pause', stop);
    ms.setActionHandler('play', () => { const a = getPassiveAudio(); if (a.src && a.paused && !a.ended) { void a.play(); setPlaying(true); } else if (cur) void playFrom(cur); });
    ms.setActionHandler('nexttrack', () => step(1));
    ms.setActionHandler('previoustrack', () => step(-1));
    return () => { (['pause', 'play', 'nexttrack', 'previoustrack'] as const).forEach((a) => ms.setActionHandler(a, null)); };
  }, [cur, playFrom, stop]);

  useEffect(() => () => { token.current++; stopPassive(); }, []);

  const total = meta.length;
  return (
    <main className="p-4 pb-28 space-y-4">
      <h1 className="text-xl font-bold inline-flex items-center gap-2"><Icon name="headphones" size={22} className="text-brand" /> 편하게 듣기</h1>
      <p className="text-sm text-slate-600">마스터리나 데일리로 <b>익숙해진 과</b>의 음원을 배경으로 반복해서 들어요. 화면을 꺼도 계속 재생돼요(기기·브라우저에 따라 제한될 수 있어요).</p>

      {unlocked.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center space-y-3">
          <Icon name="lock" size={32} className="mx-auto text-slate-400" />
          <p className="text-sm">아직 해금된 음원이 없어요. 한 과의 <b>마스터리</b>나 <b>10분 데일리</b>를 마치면 여기에 나타나요.</p>
          <div className="flex justify-center gap-2">
            <Link to="/daily" className={btnBrand}><Icon name="timer" size={14} /> 10분 데일리</Link>
            <Link to="/path" className={btn}>학습 경로</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="반복 모드">
            {MODES.map((m) => (
              <button
                key={m.v} type="button" role="radio" aria-checked={mode === m.v} onClick={() => setMode(m.v)}
                className={`inline-flex items-center gap-1.5 rounded-full border text-sm px-3 py-1.5 ${mode === m.v ? 'bg-brand text-white border-brand' : 'bg-white border-slate-300'}`}
              ><Icon name={m.icon} size={14} /> {m.l}</button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            {playing ? (
              <button type="button" className={btnBrand} onClick={stop}><Icon name="pause" size={16} /> 멈춤</button>
            ) : (
              <button type="button" className={btnBrand} onClick={() => void playFrom(cur && unlocked.some((u) => u.id === cur) ? cur : unlocked[0].id)}>
                <Icon name="play" size={16} /> 재생
              </button>
            )}
            <span className="text-xs text-slate-500">해금 {unlocked.length}/{total}과</span>
          </div>
          {note && <p role="status" className="text-xs text-amber-800">{note}</p>}
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="권 선택">
            {vols.map((v) => {
              const n = unlocked.filter((u) => u.vol === v).length;
              return (
                <button
                  key={v} type="button" role="tab" aria-selected={shownVol === v} disabled={!n} onClick={() => setVol(v)}
                  className={`rounded-full border text-sm px-3 py-1.5 disabled:opacity-40 ${shownVol === v ? 'bg-brand text-white border-brand' : 'bg-white border-slate-300'}`}
                >Vol.{v} <span className="text-xs opacity-80">{n}</span></button>
              );
            })}
          </div>
          <ul className="space-y-2">
            {unlocked.filter((m) => m.vol === shownVol).map((m) => (
              <li key={m.id} id={'passive-' + m.id}>
                <button
                  type="button" onClick={() => void playFrom(m.id)} aria-current={cur === m.id && playing}
                  className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 ${cur === m.id ? 'border-brand bg-brand-50' : 'border-slate-200 bg-white'}`}
                >
                  <Icon name={cur === m.id && playing ? 'speaker' : 'play'} size={18} className="text-brand flex-none" />
                  <span className="min-w-0">
                    <span className="block font-semibold truncate">Vol.{m.vol} · {m.no}. {m.titleZh}</span>
                    <span className="block text-xs text-slate-500 truncate">{m.titlePinyin} · {m.titleKo}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
