import { NavLink } from 'react-router-dom';
import Icon from './Icon';

const items = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/path', label: '경로', icon: 'map' },
  { to: '/daily', label: '데일리', icon: 'timer' },
  { to: '/passive', label: '듣기', icon: 'headphones' },
  { to: '/settings', label: '설정', icon: 'settings' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-xl flex">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === '/'}
            className={({ isActive }) =>
              `flex-1 py-2 text-center text-xs ${isActive ? 'text-brand font-semibold' : 'text-slate-500'}`
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
