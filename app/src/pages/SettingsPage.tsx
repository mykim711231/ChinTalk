import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cachedCount, deleteVol, downloadVol, volUrls } from '../lib/offline';
import { LEVEL_NAMES } from '../lib/contentLoader';
import { useSettingsStore, type FontSize, type BlueLight } from '../stores/useSettingsStore';
import { speak } from '../lib/tts';
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
  const cancel = useRef({ cancelled: false });
  const refresh = async (u = urls) => setHave(await cachedCount(u));
  useEffect(() => {
    let alive = true;
    void volUrls(vol).then(async (u) => { if (!alive) return; setUrls(u); setHave(await cachedCount(u)); }).catch(() => undefined);
    return () => { alive = false; cancel.current.cancelled = true; };
  }, [vol]);
  const total = urls.length;
  const full = total > 0 && have >= total;
  const run = async () => {
    cancel.current = { cancelled: false };
    setBusy(true); setErr(null);
    try { await downloadVol(urls, setHave, cancel.current); } catch { setErr('다운로드에 실패했어요. 연결을 확인하고 다시 시도해 주세요.'); }
    setBusy(false); void refresh();
  };
  const remove = async () => { await deleteVol(urls); void refresh(); };
  return (
    <Row label={`Vol.${vol} 음원`} description={total ? `${have}/${total}개 저장됨${err ? ' · ' + err : ''}` : '음원이 아직 준비 중이에요.'}>
      {busy ? (
        <button type="button" className={pill} onClick={() => { cancel.current.cancelled = true; }}>중단 {Math.round((have / Math.max(1, total)) * 100)}%</button>
      ) : full ? (
        <button type="button" className={pill} onClick={() => void remove()}><Icon name="trash" size={14} /> 삭제</button>
      ) : (
        <button type="button" className={pill} disabled={!total} onClick={() => void run()}><Icon name="download" size={14} /> 받기</button>
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
    const n = await clearContentCaches();
    setMsg({ text: `음성·본문 캐시 ${n}개를 삭제했습니다.` });
    refresh();
  };

  const onClearAll = async () => {
    if (!confirm('모든 캐시와 학습 진도·형광펜·설정이 삭제됩니다. 계속하시겠습니까?')) return;
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
          <Row label="끊어 읽기 표시" description="긴 문장의 쉼표·모점 자리에 / 를 표시해 의미 단위로 끊어 읽도록 도와줘요.">
            <Toggle label="끊어 읽기 표시" on={s.showBreaks} onClick={() => s.toggle('showBreaks')} />
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
        <SectionHeader title="음성 (TTS)" subtitle="미리 합성된 mp3로 재생하고, 없는 문장은 단말기 음성으로 대신해요." />
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
        </Card>
      </section>

      <section>
        <SectionHeader title="오프라인 음원" subtitle="권 단위로 받아 두면 인터넷 없이도 재생돼요. (권당 약 10~15MB, Wi-Fi 권장)" />
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
              <Icon name="trash" size={14} /> 음성·본문 캐시 비우기
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
