import { applyAppUpdate, checkForUpdate } from '../lib/pwa';
import { useOfflineStore } from '../stores/useOfflineStore';

export default function AppUpdate({ compact = false }: { compact?: boolean }) {
  const { updateReady, updateState } = useOfflineStore();
  const busy = ['checking', 'downloading', 'applying'].includes(updateState);
  const supported = 'serviceWorker' in navigator && window.isSecureContext;
  const message = !supported ? '이 브라우저에서는 앱 자동 업데이트를 사용할 수 없어요.'
    : updateState === 'applying' ? '새 버전으로 다시 열고 있어요…'
      : updateState === 'checking' ? '새 버전을 확인하고 있어요…'
        : updateState === 'downloading' ? '새 버전을 받고 있어요. 잠시 기다려 주세요.'
          : updateState === 'offline' ? '인터넷 연결 후 업데이트를 확인해 주세요.'
            : updateState === 'error' ? '업데이트를 마치지 못했어요. 연결 후 다시 시도해 주세요.'
              : updateReady ? '새 버전이 준비됐어요. 적용을 누르면 이 화면을 다시 열어요.'
                : updateState === 'current' ? '현재 최신 버전을 사용하고 있어요.' : '새 버전을 자동으로 받아 다음 실행 때 적용해요.';
  if (compact && !updateReady) return null;
  return (
    <div className="space-y-2" aria-label="앱 업데이트">
      {!compact && <p className="text-xs text-slate-500">현재 앱 버전 {__APP_VERSION__} · {__APP_BUILD__}</p>}
      <p role="status" className="text-sm">{message}</p>
      {updateReady && <p className="text-xs text-slate-500">학습 진도·설정·저장한 음원은 유지돼요. 이번 쉐도잉 녹음은 화면을 다시 열면 사라져요.</p>}
      <div className="flex flex-wrap gap-2">
        {!compact && <button type="button" disabled={busy || !supported} onClick={() => void checkForUpdate(true)} className="rounded-full border border-brand px-3 py-2 text-sm font-semibold text-brand disabled:opacity-40">업데이트 확인</button>}
        {updateReady && <button type="button" disabled={updateState === 'applying'} onClick={() => void applyAppUpdate()} className="rounded-full bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">새 버전 적용·다시 열기</button>}
      </div>
    </div>
  );
}
