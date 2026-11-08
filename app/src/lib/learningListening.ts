export type CaptionDisplay = { showZh: boolean; showPinyin: boolean; showKo: boolean };

export type ListeningPass = { label: string; display: CaptionDisplay; leadMs?: number };

/** 입력(모두) → 뜻 떠올리기 → 소리 집중 → 한자 읽기 → 회상(한글 먼저 보이고 leadMs 뒤 음성). 본문·회화·단어 공통. */
const buildPasses = (recallLeadMs: number): ListeningPass[] => [
  { label: '모두 표시', display: { showZh: true, showPinyin: true, showKo: true } },
  { label: '한자·병음 (뜻 숨김)', display: { showZh: true, showPinyin: true, showKo: false } },
  { label: '병음만', display: { showZh: false, showPinyin: true, showKo: false } },
  { label: '한자만', display: { showZh: true, showPinyin: false, showKo: false } },
  { label: '한글만 (떠올린 뒤 확인)', display: { showZh: false, showPinyin: false, showKo: true }, leadMs: recallLeadMs },
];

/** 문장은 단어보다 길어 떠올릴 시간을 2초로 둔다 */
export const LISTENING_PASSES = buildPasses(2000);
export const VOCAB_PASSES = buildPasses(1500);
export const PASS_COUNT = LISTENING_PASSES.length;
export const GUIDE_TEXT = `${PASS_COUNT}회 학습 듣기: 모두 표시 → 한자·병음 → 병음만 → 한자만 → 한글만(한글을 보고 뜻을 떠올린 뒤 음성 확인).`;
