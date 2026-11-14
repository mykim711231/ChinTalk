import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import StudyPage from './pages/StudyPage';
import WordSheet from './components/WordSheet';
import TopBar from './components/TopBar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PathPage from './pages/PathPage';
import LessonPage from './pages/LessonPage';
import MasteryPage from './pages/MasteryPage';
import ReviewPage from './pages/ReviewPage';
import DailyPage from './pages/DailyPage';
import PassivePage from './pages/PassivePage';
import OnboardingPage from './pages/OnboardingPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import { useSettingsStore } from './stores/useSettingsStore';
import InstallModal from './components/InstallModal';
import OfflineStatus from './components/OfflineStatus';
import { isBasicMode } from './lib/compatibility';
import { BasicModeNotice, BasicModeUnavailable } from './components/BasicMode';

export default function App() {
  const fontSize = useSettingsStore((s) => s.fontSize);
  const blueLight = useSettingsStore((s) => s.blueLight);
  const onboarded = useSettingsStore((s) => s.onboarded);
  const { pathname } = useLocation();
  const bare = pathname === '/onboarding';
  const basic = isBasicMode();
  useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty('--fs', fontSize === 'xl' ? '1.4' : fontSize === 'lg' ? '1.2' : '1');
    if (blueLight) el.setAttribute('data-bluelight', String(blueLight));
    else el.removeAttribute('data-bluelight');
  }, [fontSize, blueLight]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const home = onboarded ? <HomePage /> : <Navigate to="/onboarding" replace />;
  return (
    <div className="mx-auto max-w-xl min-h-screen min-h-[100dvh]">
      {!bare && <TopBar />}
      <OfflineStatus compact />
      {!bare && basic && <BasicModeNotice />}
      <Routes>
        <Route path="/" element={home} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/path" element={<PathPage />} />
        <Route path="/lesson/:id" element={<LessonPage />} />
        <Route path="/lesson/:id/mastery" element={basic ? <BasicModeUnavailable feature="심화 학습" /> : <MasteryPage />} />
        <Route path="/review" element={basic ? <BasicModeUnavailable feature="복습" /> : <ReviewPage />} />
        <Route path="/study" element={<StudyPage />} />
        <Route path="/daily" element={basic ? <BasicModeUnavailable feature="10분 데일리" /> : <DailyPage />} />
        <Route path="/passive" element={<PassivePage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/about" element={<AboutPage />} />
        <Route path="*" element={home} />
      </Routes>
      {!bare && <Footer />}
      {!bare && <BottomNav />}
      <WordSheet />
      <InstallModal />
    </div>
  );
}
