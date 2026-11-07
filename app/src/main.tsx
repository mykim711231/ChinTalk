import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { startOfflineFeatures } from './lib/pwa';
import { useOfflineStore } from './stores/useOfflineStore';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);

// ChinWord처럼 화면 구동과 오프라인 준비를 분리한다. 선택적 저장소 API 오류가 부팅을 막지 않게 한다.
void Promise.resolve().then(startOfflineFeatures).catch(() => useOfflineStore.setState({ core: 'error' }));
