export type CaptionDisplay = { showZh: boolean; showPinyin: boolean; showKo: boolean };

export const LISTENING_PASSES: { label: string; display: CaptionDisplay }[] = [
  { label: '병음만', display: { showZh: false, showPinyin: true, showKo: false } },
  { label: '한글만', display: { showZh: false, showPinyin: false, showKo: true } },
  { label: '한자만', display: { showZh: true, showPinyin: false, showKo: false } },
  { label: '모두 표시', display: { showZh: true, showPinyin: true, showKo: true } },
];
