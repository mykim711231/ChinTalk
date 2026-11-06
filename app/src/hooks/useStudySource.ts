import { useSearchParams } from 'react-router-dom';
import { parseStudySource } from '../lib/studyContent';
import { useSettingsStore } from '../stores/useSettingsStore';
import type { StudySource } from '../types/lesson';

/** 링크의 대상이 우선이며, 별도 지정이 없으면 마지막 선택을 사용한다. */
export function useStudySource() {
  const [params, setParams] = useSearchParams();
  const preferred = useSettingsStore((s) => s.studySource);
  const source = parseStudySource(params.get('source'), preferred);
  const setSource = (next: StudySource) => {
    useSettingsStore.getState().setStudySource(next);
    const query = new URLSearchParams(params);
    query.set('source', next);
    setParams(query, { replace: true });
  };
  return { source, setSource };
}
