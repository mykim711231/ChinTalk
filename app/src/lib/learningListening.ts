export type CaptionDisplay = { showZh: boolean; showPinyin: boolean; showKo: boolean };

/**
 * leadMs + leadPerChar×한자 수: 음성 전에 기다리는 시간(한글을 보고 떠올리는 시간)
 * shadow: 방금 재생한 시간만큼 쉬어서 따라 말할 틈을 준다
 * shuffle: 문장 순서를 섞어 순서 기억이 아니라 문장 자체를 떠올리게 한다
 */
export type ListeningPass = { label: string; display: CaptionDisplay; leadMs?: number; leadPerChar?: number; shadow?: boolean; shuffle?: boolean };

const D = (showZh: boolean, showPinyin: boolean, showKo: boolean): CaptionDisplay => ({ showZh, showPinyin, showKo });

/** 이해 → 청해 → 읽기(힌트 줄이기) → 따라 말하기 → 떠올리기(한글 먼저, 순서 섞음). 본문·회화. */
export const LISTENING_PASSES: ListeningPass[] = [
  { label: '모두 표시', display: D(true, true, true) },
  { label: '소리만 (화면 가림)', display: D(false, false, false) },
  { label: '한자·병음 (뜻 숨김)', display: D(true, true, false) },
  { label: '병음만', display: D(false, true, false) },
  { label: '한자만', display: D(true, false, false) },
  { label: '한자·병음 (따라 말하기)', display: D(true, true, false), shadow: true },
  { label: '한글만 (떠올린 뒤 확인)', display: D(false, false, true), leadMs: 2000, leadPerChar: 300, shuffle: true },
];

/** 단어는 짧아서 청해·순서 섞기 없이 5회: 4회에 따라 말하기 간격, 5회는 한글을 보고 떠올림. */
export const VOCAB_PASSES: ListeningPass[] = [
  { label: '모두 표시', display: D(true, true, true) },
  { label: '한자·병음 (뜻 숨김)', display: D(true, true, false) },
  { label: '병음만', display: D(false, true, false) },
  { label: '한자만 (따라 말하기)', display: D(true, false, false), shadow: true },
  { label: '한글만 (떠올린 뒤 확인)', display: D(false, false, true), leadMs: 1500, leadPerChar: 200 },
];

export const LISTENING_GUIDE = `${LISTENING_PASSES.length}회 학습 듣기: 모두 표시 → 소리만 → 한자·병음 → 병음만 → 한자만 → 따라 말하기(재생한 시간만큼 쉬며 따라 읽기) → 한글만(뜻을 보고 중국어를 떠올린 뒤 음성 확인, 순서 섞임).`;
export const VOCAB_GUIDE = `${VOCAB_PASSES.length}회 학습 듣기: 모두 표시 → 한자·병음 → 병음만 → 한자만(따라 말하기) → 한글만(뜻을 보고 중국어를 떠올린 뒤 음성 확인).`;
