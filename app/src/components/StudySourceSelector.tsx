import { STUDY_SOURCES } from '../lib/studyContent';
import type { Lesson, StudySource } from '../types/lesson';

export default function StudySourceSelector({ value, onChange, lesson }: {
  value: StudySource; onChange: (source: StudySource) => void; lesson?: Lesson | null;
}) {
  const text = !lesson || lesson.text.length > 0;
  const dialog = !lesson || lesson.dialogs.some((d) => d.turns.length > 0);
  return (
    <div role="group" aria-label="학습 대상" className="flex flex-wrap gap-2">
      <span className="w-full text-sm font-semibold">학습 대상</span>
      {STUDY_SOURCES.map(({ value: source, label }) => (
        <button key={source} type="button" aria-pressed={value === source}
          disabled={source === 'text' ? !text : source === 'dialog' ? !dialog : !text && !dialog}
          onClick={() => { if (value !== source) onChange(source); }}
          className={`flex-1 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold disabled:opacity-40 ${value === source ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
