import type { LessonMeta } from '../types/lesson';

/** 과 선택 리스트 박스. recId → '(추천)', isDone(id) → '✔' 표시. 목록에는 마스터한 과 + 추천 과(+현재 선택)만 보여 순서를 지키게 한다. */
export default function LessonSelect({ label, metas, value, onChange, recId, isDone }: {
  label: string; metas: LessonMeta[]; value: string | null; onChange: (id: string) => void; recId?: string;
  isDone?: (id: string) => boolean;
}) {
  const shown = isDone ? metas.filter((m) => isDone(m.id) || m.id === recId || m.id === value) : metas;
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select
        value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal"
      >
        {shown.map((m) => (
          <option key={m.id} value={m.id}>
            {isDone?.(m.id) ? '✔ ' : ''}Vol.{m.vol} · {m.no}과 · {m.titleZh} {m.titleKo}{m.id === recId ? ' (추천)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
