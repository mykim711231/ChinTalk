import { useEffect, useState } from 'react';
import { isIOS, isInAppBrowser, isStandalone } from '../lib/inapp';
import { useSettingsStore } from '../stores/useSettingsStore';
import Icon from './Icon';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const WEEK = 7 * 24 * 3600 * 1000;

/** S-010 설치 안내: Android 는 beforeinstallprompt, iOS 는 공유→홈 화면에 추가 가이드. 온보딩 이후 / 7일 후 재표시 */
export default function InstallModal() {
  const { onboarded, installDismissedAt, dismissInstall } = useSettingsStore();
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  const eligible = onboarded && !isStandalone() && !isInAppBrowser().kind && Date.now() - installDismissedAt > WEEK;
  useEffect(() => {
    if (!eligible || !(evt || isIOS())) return;
    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, [eligible, evt]);

  if (!open) return null;
  const close = () => { dismissInstall(); setOpen(false); };
  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => undefined);
    close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="inst-title">
      <div className="bg-paper rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="download" size={22} className="text-brand" />
          <h3 id="inst-title" className="text-lg font-bold">앱으로 설치하기</h3>
        </div>
        <p className="text-sm text-slate-700">홈 화면에 추가하면 앱처럼 열리고, 한 번 들은 음원은 인터넷 없이도 재생돼요.</p>
        {evt ? (
          <button type="button" onClick={() => void install()} className="w-full mt-4 rounded-full bg-brand text-white font-semibold py-3">설치</button>
        ) : (
          <ol className="mt-3 space-y-1 text-sm list-decimal pl-5">
            <li>Safari 하단의 <b>공유(↑)</b> 버튼을 누르세요.</li>
            <li><b>홈 화면에 추가</b>를 선택하세요.</li>
          </ol>
        )}
        <button type="button" onClick={close} className="w-full mt-2 rounded-full border border-slate-300 bg-white font-semibold py-2.5">
          나중에 (7일간 보지 않기)
        </button>
      </div>
    </div>
  );
}
