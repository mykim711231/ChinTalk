import { useOfflineStore } from '../stores/useOfflineStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { resumeOfflineDownload, retryOfflineSetup } from '../lib/pwa';

export default function OfflineStatus({ compact = false }: { compact?: boolean }) {
  const s = useOfflineStore();
  const { voiceMode, autoDownload, setAutoDownload } = useSettingsStore();
  const recorded = voiceMode === 'recorded';
  if (compact && s.core === 'unsupported' && !s.playbackError) return null;
  if (compact && s.core === 'ready' && (!recorded || s.audio === 'ready' || !autoDownload) && !s.updateReady && !s.playbackError) return null;
  const message = s.core === 'preparing' ? '전권 교재·단어장을 자동 저장하고 있어요.'
    : s.core === 'error' ? '교재 자동 저장을 마치지 못했어요. 연결 후 다시 시도해 주세요.'
      : s.core === 'unsupported' ? '이 브라우저에서는 오프라인 자동 저장을 사용할 수 없어요.'
        : !recorded ? '교재·단어장 저장 완료. 기기 음성을 사용하며 녹음 음원은 자동으로 받지 않아요.'
          : s.audio === 'ready' ? '교재·단어장·녹음 음원이 모두 저장됐어요.'
          : s.audio === 'downloading' ? '녹음 음원을 자동 저장하고 있어요. 앱을 열어 두세요.'
            : s.audio === 'error' ? '받지 못한 음원이 있어요. 다시 받으면 이어서 저장해요.'
              : s.audio === 'offline' ? '저장한 자료로 학습할 수 있어요. 연결되면 자동 저장을 이어가요.'
                : !autoDownload ? '교재·단어장 저장 완료. 녹음 음원 자동 저장은 꺼져 있어요.' : '녹음 음원 저장을 준비하고 있어요.';
  return (
    <div className={`text-sm ${compact ? 'mx-4 mt-2 rounded-xl border border-brand-200 bg-brand-50 p-3' : 'space-y-2'}`}>
      <p role="status">{message}</p>
      {s.playbackError && <div className="mt-1 text-amber-800">
        <p role="alert">{s.playbackError}</p>
        <button type="button" aria-label="음성 안내 닫기" className="mt-1 text-xs underline" onClick={() => useOfflineStore.setState({ playbackError: null })}>닫기</button>
      </div>}
      {recorded && s.total > 0 && <>
        <p className="mt-1 text-xs text-slate-600">음원 {s.done.toLocaleString()}/{s.total.toLocaleString()}개 저장됨{s.failed ? ` · 실패 ${s.failed}개` : ''}</p>
        <progress aria-label="음원 저장 진행률" value={s.done} max={s.total} className="mt-1 h-2 w-full accent-brand" />
      </>}
      {s.updateReady && <p className="mt-1 text-xs text-brand">새 버전을 받아 두었어요. ChinTalk 창을 모두 닫았다가 다시 열면 자동 적용돼요.</p>}
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-brand">
        {s.core === 'error' && <button type="button" onClick={() => void retryOfflineSetup()}>교재 다시 저장</button>}
        {recorded && s.core === 'ready' && s.audio === 'error' && <button type="button" onClick={() => { setAutoDownload(true); void resumeOfflineDownload(); }}>음원 다시 받기</button>}
        {recorded && s.audio === 'downloading' && <button type="button" onClick={() => setAutoDownload(false)}>저장 일시 중지</button>}
      </div>
    </div>
  );
}
