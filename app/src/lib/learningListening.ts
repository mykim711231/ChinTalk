export type CaptionDisplay = { showZh: boolean; showPinyin: boolean; showKo: boolean };

export type ListeningPass = { label: string; display: CaptionDisplay; leadMs?: number };

export const LISTENING_PASSES: ListeningPass[] = [
  { label: '병음만', display: { showZh: false, showPinyin: true, showKo: false } },
  { label: '한글만', display: { showZh: false, showPinyin: false, showKo: true } },
  { label: '한자만', display: { showZh: true, showPinyin: false, showKo: false } },
  { label: '모두 표시', display: { showZh: true, showPinyin: true, showKo: true } },
];

/** 단어: 입력(모두) → 뜻 떠올리기 → 소리 집중 → 회상(한글 먼저 보이고 1.5초 뒤 음성) */
export const VOCAB_PASSES: ListeningPass[] = [
  { label: '모두 표시', display: { showZh: true, showPinyin: true, showKo: true } },
  { label: '한자·병음 (뜻 숨김)', display: { showZh: true, showPinyin: true, showKo: false } },
  { label: '병음만', display: { showZh: false, showPinyin: true, showKo: false } },
  { label: '한글만 (떠올린 뒤 확인)', display: { showZh: false, showPinyin: false, showKo: true }, leadMs: 1500 },
];
