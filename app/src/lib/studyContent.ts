import type { Lesson, StudySource, Verse } from '../types/lesson';

export type StudyLine = { verse: Verse; source: 'text' | 'dialog'; speaker?: string; section?: string };
export const STUDY_SOURCES: { value: StudySource; label: string }[] = [
  { value: 'text', label: '본문' }, { value: 'dialog', label: '회화' }, { value: 'all', label: '본문+회화' },
];
export const studySourceLabel = (source: StudySource) => STUDY_SOURCES.find((s) => s.value === source)!.label;
export const parseStudySource = (value: string | null, fallback: StudySource = 'text'): StudySource =>
  value === 'text' || value === 'dialog' || value === 'all' ? value : fallback;

/** 학습 대상 안내 문구: "본문+회화 · 17문장 (본문 다음 회화 순서)" 형식으로 화면마다 통일한다. */
export const studyTargetText = (source: StudySource, count?: number) =>
  `${studySourceLabel(source)}${count === undefined ? '' : ` · ${count}문장`}`;

/** 함께 학습할 때는 본문 다음에 모든 회화를 교재 순서로 재생한다. */
export function studyLines(lesson: Lesson, source: StudySource): StudyLine[] {
  const text: StudyLine[] = source === 'dialog' ? [] : lesson.text.map((verse, i) => ({ verse, source: 'text', section: i === 0 ? '본문' : undefined }));
  const dialog: StudyLine[] = source === 'text' ? [] : lesson.dialogs.flatMap((d) => d.turns.map((turn, i) => ({
    ...turn, source: 'dialog' as const, section: i === 0 ? `회화 · ${d.title}` : undefined,
  })));
  return [...text, ...dialog];
}
