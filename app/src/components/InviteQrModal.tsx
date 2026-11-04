import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Icon from './Icon';

/** 앱 주소 QR — 카메라가 인식해야 하므로 테마와 무관하게 흰 배경/검은 모듈 고정 */
export default function InviteQrModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-labelledby="qr-title" onClick={onClose}
    >
      <div className="bg-paper rounded-2xl max-w-md w-full p-6 shadow-xl max-h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 id="qr-title" className="text-xl font-bold">QR 코드로 공유하기</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="p-1 text-slate-500"><Icon name="x" size={24} /></button>
        </div>
        <p className="font-semibold">휴대폰 카메라로 아래 그림을 비추면 ChinTalk가 열려요.</p>
        <div className="mt-4 flex justify-center">
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <QRCodeSVG value={url} size={224} level="M" marginSize={2} bgColor="#FFFFFF" fgColor="#000000" title="ChinTalk 주소" />
          </div>
        </div>
        <ol className="mt-5 space-y-2 text-sm">
          {['상대방 휴대폰의 카메라 앱을 켭니다.', 'QR 그림을 비춥니다.', '화면에 뜨는 링크를 누르면 열립니다. 열린 뒤 "홈 화면에 추가"로 설치하세요.'].map((t, i) => (
            <li key={t} className="flex gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-brand text-white text-xs font-bold grid place-items-center">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-500">QR이 잘 안 되면 이 주소를 알려 주세요</p>
          <p className="text-sm font-medium break-all mt-1 select-all">{url}</p>
          <button type="button" onClick={() => void copy()} className="mt-2 rounded-full border border-slate-200 bg-white text-sm font-semibold px-3 py-1.5">
            {copied ? '복사했어요' : '주소 복사'}
          </button>
        </div>
        <button type="button" onClick={onClose} className="w-full mt-5 rounded-full bg-brand text-white font-semibold py-3">닫기</button>
      </div>
    </div>
  );
}
