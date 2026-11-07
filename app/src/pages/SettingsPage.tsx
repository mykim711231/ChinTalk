import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cachedCount, cancelAudioDownloads, deleteVol, downloadVol, volUrls } from '../lib/offline';
import { LEVEL_NAMES } from '../lib/contentLoader';
import { useSettingsStore, type FontSize, type BlueLight } from '../stores/useSettingsStore';
import { speak, stopSpeak, ttsSupported } from '../lib/tts';
import { pauseOfflineDownload } from '../lib/pwa';
import { useOfflineStore } from '../stores/useOfflineStore';
import OfflineStatus from '../components/OfflineStatus';
import AppUpdate from '../components/AppUpdate';
import {
  getStorageInfo, clearContentCaches, clearAllCaches,
  exportBackup, importBackup, resetAllUserData, type StorageInfo,
} from '../lib/storage';
import { Card, Row, Toggle, Segmented, SectionHeader } from '../components/ui';
import Icon from '../components/Icon';

const pill = 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white text-sm font-semibold px-3 py-2';

function VolDownload({ vol }: { vol: number }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [have, setHave] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cancel = useRef(new AbortController());
  const autoPhase = useOfflineStore((s) => s.audio);
  const refresh = async (u = urls) => setHave(await cachedCount(u));
  useEffect(() => {
    let alive = true;
    void volUrls(vol).then(async (u) => { if (!alive) return; setUrls(u); setHave(await cachedCount(u)); }).catch(() => undefined);
    return () => { alive = false; cancel.current.abort(); };
  }, [vol]);
  useEffect(() => { if (autoPhase !== 'downloading') void refresh(); }, [autoPhase]);
  const total = urls.length;
  const full = total > 0 && have >= total;
  const run = async () => {
    cancel.current = new AbortController();
    setBusy(true); setErr(null);
    try { await downloadVol(urls, setHave, cancel.current.signal); } catch { setErr('다운로드에 실패했어요. 연결을 확인하고 다시 시도해 주세요.'); }
    setBusy(false); void refresh();
  };
  const remove = async () => {
    useSettingsStore.getState().setAutoDownload(false);
    await pauseOfflineDownload();
    await deleteVol(urls);
    void refresh();
  };
  return (
    <Row label={`Vol.${vol} 음원`} description={total ? `${have}/${total}개 저장됨${err ? ' · ' + err : ''}` : '음원이 아직 준비 중이에요.'}>
      {busy ? (
        <button type="button" className={pill} onClick={() => cancel.current.abort()}>중단 {Math.round((have / Math.max(1, total)) * 100)}%</button>
      ) : full ? (
        <button type="button" className={pill} disabled={autoPhase === 'downloading'} onClick={() => void remove()}><Icon name="trash" size={14} /> 삭제</button>
      ) : (
        <button type="button" className={pill} disabled={!total || autoPhase === 'downloading'} onClick={() => void run()}><Icon name="download" size={14} /> 받기</button>
      )}
    </Row>
  );
}

export default function SettingsPage() {
  const s = useSettingsStore();
  const nav = useNavigate();
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!ttsSupported()) return;
    const update = () => setVoices(window.speechSynthesis.getVoices().filter((v) => /^zh/i.test(v.lang)));
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);

  const showToast = (t: string) => {
    setToast(t);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3000);
  };
  const refresh = () => void getStorageInfo().then(setStorage);
  useEffect(() => {
    refresh();
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, []);

  const onExport = () => {
    const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chintalk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ text: '백업 파일을 저장했습니다. 안전한 곳에 보관해 주세요.' });
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !confirm('백업 파일의 내용으로 현재 학습 기록을 덮어씁니다. 계속하시겠습니까?')) return;
    try {
      const n = importBackup(JSON.parse(await f.text()));
      setMsg({ text: `${n}개 항목을 복원했습니다. 앱을 새로 불러옵니다…` });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setMsg({ text: `복원 실패: ${err instanceof Error ? err.message : '파일을 읽을 수 없습니다.'}`, error: true });
    }
  };

  const onClearContent = async () => {
    s.setAutoDownload(false);
    await pauseOfflineDownload();
    await cancelAudioDownloads();
    const n = await clearContentCaches();
    setMsg({ text: `다운로드 음원 캐시 ${n}개를 삭제했습니다. 교재·단어장과 학습 기록은 유지됩니다.` });
    refresh();
  };

  const onClearAll = async () => {
    if (!confirm('모든 캐시와 학습 진도·형광펜·설정이 삭제됩니다. 계속하시겠습니까?')) return;
    s.setAutoDownload(false);
    await pauseOfflineDownload();
    await cancelAudioDownloads();
    await clearAllCaches();
    resetAllUserData();
    window.location.reload();
  };

  return (
    <main className="p-4 space-y-2">
      <h1 className="text-xl font-bold">설정</h1>

      <section>
        <SectionHeader title="화면" />
        <Card className="divide-y divide-slate-200">
          <Row label="글자 크기" description="본문 전체의 글자 크기예요." stack>
            <Segmented<FontSize>
              value={s.fontSize}
              options={[{ v: 'md', l: '보통' }, { v: 'lg', l: '크게' }, { v: 'xl', l: '아주 크게' }]}
              onChange={(v) => { s.setFontSize(v); showToast(v === 'md' ? '글자 크기를 보통으로 맞췄어요.' : v === 'lg' ? '글자를 크게 키웠어요.' : '글자를 아주 크게 키웠어요.'); }}
            />
          </Row>
          <Row label="한자 표시" description="중국어 문장(中文)을 보여줍니다.">
            <Toggle label="한자 표시" on={s.showZh} onClick={() => { s.toggle('showZh'); showToast(s.showZh ? '한자를 숨겼어요.' : '한자를 다시 표시해요.'); }} />
          </Row>
          <Row label="병음 표시" description="한자 발음(pīnyīn)을 보여줍니다.">
            <Toggle label="병음 표시" on={s.showPinyin} onClick={() => { s.toggle('showPinyin'); showToast(s.showPinyin ? '병음을 숨겼어요.' : '병음을 다시 표시해요.'); }} />
          </Row>
        <Row label="의미단위 표시" description="문장을 이해하기 좋은 의미 덩어리로 나누어 / 로 표시해요. 예: 我是 / 韩国人。 전체 듣기는 문장 전체를 재생해요.">
          <Toggle label="의미단위 표시" on={s.showMeaningUnits} onClick={() => { s.toggle('showMeaningUnits'); showToast(s.showMeaningUnits ? '의미단위 표시를 껐어요.' : '의미단위를 표시해요.'); }} />
        </Row>
          <Row label="한글 표시" description="한국어 뜻을 함께 보여줍니다.">
            <Toggle label="한글 표시" on={s.showKo} onClick={() => { s.toggle('showKo'); showToast(s.showKo ? '한글 뜻을 숨겼어요.' : '한글 뜻을 다시 표시해요.'); }} />
          </Row>
          <Row label="청색광 차단" description="화면 전체에 따뜻한 색을 덧입혀 파란빛을 줄여요. 단계가 높을수록 더 따뜻해져요." stack>
            <Segmented<string>
              value={String(s.blueLight)}
              options={[{ v: '0', l: '끄기' }, { v: '1', l: '약하게' }, { v: '2', l: '보통' }, { v: '3', l: '강하게' }]}
              onChange={(v) => { s.setBlueLight(Number(v) as BlueLight); showToast(v === '0' ? '청색광 차단을 껐어요.' : '청색광 차단을 켰어요.'); }}
            />
          </Row>
        </Card>
      </section>

      <section>
        <SectionHeader title="학습" subtitle="홈에 표시되는 진도의 기준 레벨이에요." />
        <Card className="divide-y divide-slate-200">
          <Row label="내 레벨" stack>
            <Segmented<string>
              grid
              value={String(s.level)}
              options={[1, 2, 3, 4].map((l) => ({ v: String(l), l: LEVEL_NAMES[l] }))}
              onChange={(v) => { s.setLevel(Number(v) as 1 | 2 | 3 | 4); showToast('내 레벨을 바꿨어요.'); }}
            />
          </Row>
        </Card>
      </section>

      <section>
        <SectionHeader title="음성 재생 방식" subtitle="기기 음성을 기본으로 사용해요. 녹음 음성은 저장한 mp3를 재생해요." />
        <Card>
          <Row label="재생 방식" description="기기 음성을 오프라인에서 쓰려면 스마트폰에 중국어 음성팩이 설치되어 있어야 해요." stack>
            <Segmented<'device' | 'recorded'> value={s.voiceMode}
              options={[{ v: 'device', l: '기기 음성' }, { v: 'recorded', l: '녹음 음성' }]}
              onChange={(mode) => { stopSpeak(); s.setVoiceMode(mode); showToast(mode === 'device' ? '기기 음성으로 재생해요.' : '녹음 음성으로 재생해요.'); }} />
          </Row>
        </Card>
      </section>

      <section>
        <SectionHeader title="음성 (TTS)" subtitle={s.voiceMode === 'device' ? '선택한 중국어 기기 음성으로 읽어 줘요.' : '녹음된 mp3를 우선 재생해요.'} />
        <Card className="divide-y divide-slate-200">
          <Row label={`속도: ${s.ttsRate.toFixed(2)}×`} description="처음 배울 때는 0.80× 정도를 권해요.">
            <input
              type="range" min={0.6} max={1.4} step={0.05} value={s.ttsRate} className="w-40" aria-label="음성 속도"
              onChange={(e) => s.setTtsRate(Number(e.target.value))}
            />
          </Row>
          <Row label="한글 음성" description="10분 데일리·편하게 듣기·마스터리에서 중국어 다음에 한글 번역을 읽어 줘요.">
            <Toggle label="한글 음성" on={s.koVoice} onClick={() => { s.setKoVoice(!s.koVoice); showToast(s.koVoice ? '한글 음성을 껐어요.' : '한글 음성을 켰어요.'); }} />
          </Row>
          <Row label="속도 확인">
            <button type="button" className={pill} onClick={() => void speak('你好，欢迎学习中文。', s.ttsRate)}>
              <Icon name="speaker" size={16} /> 들어보기
            </button>
          </Row>
          <Row label="중국어 음성 선택" stack description={voices.length ? '기기 음성은 오프라인 사용 가능 여부가 음성팩에 따라 달라요.' : '중국어 음성이 보이지 않으면 스마트폰의 음성 설정에서 중국어 음성팩을 설치해 주세요.'}>
            <select aria-label="중국어 음성 선택" value={s.ttsVoiceUri ?? ''} disabled={s.voiceMode !== 'device'}
              onChange={(e) => { stopSpeak(); s.setTtsVoiceUri(e.target.value || null); }}
              className="w-full max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40 sm:max-w-64">
              <option value="">자동</option>
              {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}{v.localService ? ' (기기)' : ' (온라인)'}</option>)}
            </select>
          </Row>
        </Card>
      </section>

      <section>
        <SectionHeader title="앱 업데이트" subtitle="기존에 설치한 앱에서 계속 사용해요. 새로 설치할 필요 없어요." />
        <Card className="p-4 space-y-3">
          <AppUpdate />
          <div className="border-t border-slate-200 pt-3 text-sm space-y-2">
            <p>Android 8·9 태블릿에서 설치한 앱이 바로 닫히면 Chrome으로 여는 호환용 바로가기를 사용해 보세요.</p>
            <a className="inline-block rounded-full border border-brand px-3 py-2 font-semibold text-brand" href={`${import.meta.env.BASE_URL}browser.html#/`}>브라우저 호환 모드 열기</a>
            <p className="text-xs text-slate-500">호환 화면을 Chrome에서 연 뒤 ⋮ → 홈 화면에 추가 → 바로가기 만들기로 추가하세요. 앱 설치 대신 Chrome으로 여는 바로가기를 사용해요. 같은 Chrome의 학습 기록과 저장 자료를 사용해요.</p>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="자동 설치·오프라인 저장" subtitle="전권 교재·단어장은 자동 저장돼요." />
        <Card className="divide-y divide-slate-200 mb-3">
          <div className="p-4"><OfflineStatus /></div>
          {s.voiceMode === 'recorded' ? <Row label="녹음 음원 자동 저장" description="녹음 음성을 사용할 때 전체 녹음 음원을 받아 두고, 중단되면 이어받아요. Wi-Fi 사용을 권장해요.">
            <Toggle label="녹음 음원 자동 저장" on={s.autoDownload} onClick={() => s.setAutoDownload(!s.autoDownload)} />
          </Row> : <Row label="녹음 음원 자동 저장" description="기기 음성 사용 중에는 받지 않아요. 녹음 음성을 선택하면 자동 저장을 설정할 수 있어요."><span className="text-sm text-slate-500">사용 안 함</span></Row>}
        </Card>
        <SectionHeader title="권별 녹음 음원" subtitle="녹음 음성이 필요하면 받기를 눌러 원하는 권만 직접 저장할 수 있어요." />
        <Card className="divide-y divide-slate-200">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((v) => <VolDownload key={v} vol={v} />)}
        </Card>
      </section>

      <section>
        <SectionHeader title="학습 진행상황 백업" subtitle="진도·형광펜·설정을 파일로 저장하거나, 새 기기에서 복원할 수 있어요." />
        <Card className="p-4 space-y-3">
          <p className="text-sm text-slate-500 leading-snug">
            이 앱은 서버가 없어 기록이 이 기기 안에만 저장됩니다. 기기를 바꾸거나 앱을 다시 설치하기 전에 백업해 두세요.
          </p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onImport(e)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onExport} className="inline-flex items-center gap-1.5 rounded-full bg-brand text-white text-sm font-semibold px-3 py-2">
              <Icon name="download" size={14} /> 백업 파일 저장
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className={pill}>
              <Icon name="upload" size={14} /> 백업에서 복원
            </button>
          </div>
          {msg && <p className={`text-sm ${msg.error ? 'text-red-600' : 'text-green-700'}`}>{msg.text}</p>}
        </Card>
      </section>

      <section>
        <SectionHeader
          title="저장 공간"
          subtitle="용량이 부족할 때만 캐시를 비우세요."
          right={<button type="button" onClick={refresh} className="inline-flex items-center gap-1 text-sm text-brand"><Icon name="refresh" size={14} /> 새로고침</button>}
        />
        <Card className="p-4 space-y-3">
          {storage?.supported ? (
            <>
              <p className="text-sm">
                사용 중: <b>{storage.usageMB} MB</b> / 할당: <b>{storage.quotaMB} MB</b>{' '}
                <span className="text-slate-500">({storage.percent}%)</span>
              </p>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-brand" style={{ width: `${Math.min(100, storage.percent)}%` }} />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">브라우저가 저장 공간 정보를 제공하지 않습니다.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => void onClearContent()} className={pill}>
              <Icon name="trash" size={14} /> 다운로드한 음원 비우기
            </button>
            <button type="button" onClick={() => void onClearAll()} className="inline-flex items-center gap-1.5 rounded-full border border-red-600 bg-red-50 text-red-700 text-sm font-semibold px-3 py-2">
              <Icon name="trash" size={14} /> 전체 초기화
            </button>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="정보" />
        <Card className="divide-y divide-slate-200">
          <Link to="/settings/about" className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="inline-flex items-center gap-2"><Icon name="info" size={16} className="text-brand" /> 앱 정보 · 라이선스</span>
            <Icon name="chevronRight" size={16} className="text-slate-400" />
          </Link>
          <button type="button" onClick={() => { s.setOnboarded(false); nav('/onboarding'); }} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
            <span className="inline-flex items-center gap-2"><Icon name="refresh" size={16} className="text-brand" /> 온보딩 다시 보기</span>
            <Icon name="chevronRight" size={16} className="text-slate-400" />
          </button>
          <Link to="/help" className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="inline-flex items-center gap-2"><Icon name="help" size={16} className="text-brand" /> 도움말</span>
            <Icon name="chevronRight" size={16} className="text-slate-400" />
          </Link>
        </Card>
      </section>

      {toast && (
        <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 pointer-events-none">
          <p className="max-w-sm rounded-full bg-brand text-white text-sm font-semibold px-4 py-2 shadow-lg text-center">{toast}</p>
        </div>
      )}
    </main>
  );
}
