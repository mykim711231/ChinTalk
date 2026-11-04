// 로컬 타임존 기준 YYYY-MM-DD (UTC 금지, §12.5)
export const toLocalDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
