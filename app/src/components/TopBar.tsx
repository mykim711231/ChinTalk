import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-paper/95 backdrop-blur px-4 py-2.5">
      <Link to="/" className="flex items-center gap-2 min-w-0" aria-label="ChinTalk 홈">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-brand text-white text-[10px] font-extrabold leading-[1.05] text-center">
          Chin<br />Talk
        </span>
        <span className="font-bold text-brand text-lg">ChinTalk</span>
        <span className="text-sm text-slate-500 truncate">中文听力</span>
      </Link>
      <nav className="flex items-center gap-1">
        <Link to="/help" aria-label="도움말" className="rounded-full p-2 text-slate-700 hover:bg-slate-100"><Icon name="help" size={22} /></Link>
        <Link to="/settings" aria-label="설정" className="rounded-full p-2 text-slate-700 hover:bg-slate-100"><Icon name="settings" size={22} /></Link>
      </nav>
    </header>
  );
}
