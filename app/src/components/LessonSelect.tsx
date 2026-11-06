import type { LessonMeta } from '../types/lesson';

/** 과 선택 리스트 박스 (10분 데일리와 동일한 형식). recId 가 있으면 '(추천)' 표시 */
export default function LessonSelect({ label, metas, value, onChange, recId }: {
  label: string; metas: LessonMeta[]; value: string | null; onChange: (id: string) => void; recId?: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select
        value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal"
      >
        {metas.map((m) => (
          <option key={m.id} value={m.id}>
            Vol.{m.vol} · {m.no}과 · {m.titleZh} {m.titleKo}{m.id === recId ? ' (추천)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
