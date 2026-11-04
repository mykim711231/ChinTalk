import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import TopBar from './components/TopBar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PathPage from './pages/PathPage';
import LessonPage from './pages/LessonPage';
import MasteryPage from './pages/MasteryPage';
import DailyPage from './pages/DailyPage';
import PassivePage from './pages/PassivePage';
import OnboardingPage from './pages/OnboardingPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import { useSettingsStore } from './stores/useSettingsStore';

export default function App() {
  const fontSize = useSettingsStore((s) => s.fontSize);
  const blueLight = useSettingsStore((s) => s.blueLight);
  const onboarded = useSettingsStore((s) => s.onboarded);
  const { pathname } = useLocation();
  const bare = pathname === '/onboarding';
  useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty('--fs', fontSize === 'xl' ? '1.4' : fontSize === 'lg' ? '1.2' : '1');
    if (blueLight) el.setAttribute('data-bluelight', String(blueLight));
    else el.removeAttribute('data-bluelight');
  }, [fontSize, blueLight]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const home = onboarded ? <HomePage /> : <Navigate to="/onboarding" replace />;
  return (
    <div className="mx-auto max-w-xl min-h-screen">
      {!bare && <TopBar />}
      <Routes>
        <Route path="/" element={home} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/path" element={<PathPage />} />
        <Route path="/lesson/:id" element={<LessonPage />} />
        <Route path="/lesson/:id/mastery" element={<MasteryPage />} />
        <Route path="/daily" element={<DailyPage />} />
        <Route path="/passive" element={<PassivePage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/about" element={<AboutPage />} />
        <Route path="*" element={home} />
      </Routes>
      {!bare && <Footer />}
      {!bare && <BottomNav />}
    </div>
  );
}
