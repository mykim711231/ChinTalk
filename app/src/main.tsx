import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { startOfflineFeatures } from './lib/pwa';
import { useOfflineStore } from './stores/useOfflineStore';
import { isStandalone } from './lib/inapp';

// 예전 설치 바로가기·업데이트가 설정 주소를 기억해도 설치 앱의 새 실행은 홈에서 시작한다.
// 이미 실행된 앱의 설정 이동과 학습 화면 딥링크는 그대로 둔다.
if (isStandalone() && /^#\/settings(?:[/?]|$)/.test(window.location.hash)) {
  const base = import.meta.env.BASE_URL;
  const entry = window.location.pathname === `${base}browser.html` ? `${base}browser.html` : base;
  window.history.replaceState(window.history.state, '', new URL(entry, window.location.origin).href);
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);

// ChinWord처럼 화면 구동과 오프라인 준비를 분리한다. 선택적 저장소 API 오류가 부팅을 막지 않게 한다.
void Promise.resolve().then(startOfflineFeatures).catch(() => useOfflineStore.setState({ core: 'error' }));
