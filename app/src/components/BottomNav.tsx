import { NavLink, useLocation } from 'react-router-dom';
import Icon from './Icon';

const items = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/path', label: '경로', icon: 'map' },
  { to: '/study', label: '학습', icon: 'target' },
  { to: '/settings', label: '설정', icon: 'settings' },
];

const STUDY = /^\/(study|daily|passive|lesson\/[^/]+\/mastery)/;

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-xl flex">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === '/'}
            className={({ isActive }) =>
              `flex-1 py-2 text-center text-xs ${isActive || (i.to === '/study' && STUDY.test(pathname)) ? 'text-brand font-semibold' : 'text-slate-500'}`
            }
          >
            <Icon name={i.icon} className="mx-auto mb-0.5" size={22} />
            {i.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
