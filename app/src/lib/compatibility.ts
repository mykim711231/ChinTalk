/** 구형 Android는 기본 학습만 제공한다. 축약 UA의 Android 10도 Chrome 버전으로 구분한다. */
export function basicModeReason(userAgent: string, pathname: string, base: string): 'entry' | 'android' | 'chrome' | null {
  if (pathname === `${base}browser.html`) return 'entry';
  const android = /Android\s+(\d+)/i.exec(userAgent);
  if (!android) return null;
  if (Number(android[1]) < 10) return 'android';
  const chrome = /Chrome\/(\d+)/i.exec(userAgent);
  return chrome && Number(chrome[1]) <= 138 ? 'chrome' : null;
}

export function isBasicMode(): boolean {
  return basicModeReason(navigator.userAgent, window.location.pathname, import.meta.env.BASE_URL) !== null;
}
