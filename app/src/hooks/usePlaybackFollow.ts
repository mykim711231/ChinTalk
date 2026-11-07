import { useEffect, useRef } from 'react';

/** 현재 문장이 메뉴 뒤로 가려질 때만 이동한다. 포커스와 사용자의 동작 줄이기 설정을 유지한다. */
export function usePlaybackFollow(index: number, scope: string) {
  const readingRef = useRef<HTMLElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const header = document.querySelector('header');
    const controls = controlsRef.current;
    if (!header || !controls) return;
    const position = () => { controls.style.top = `${header.getBoundingClientRect().height}px`; };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(header);
    return () => observer.disconnect();
  }, [scope]);

  useEffect(() => {
    if (index < 0) return;
    let moved = false;
    const frame = requestAnimationFrame(() => {
      const line = readingRef.current?.querySelector<HTMLElement>(`[data-playback-line="${index}"]`);
      if (!line) return;
      const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      const controlsHeight = controlsRef.current?.getBoundingClientRect().height ?? 0;
      const top = headerHeight + controlsHeight + 12;
      const bottom = (document.querySelector('[data-app-bottom-nav]')?.getBoundingClientRect().top ?? window.innerHeight) - 12;
      const rect = line.getBoundingClientRect();
      if (rect.top >= top && rect.bottom <= bottom) return;
      // 화면보다 긴 문장은 시작 부분을 보여 주고, 나머지는 편하게 읽도록 둔다.
      const target = top + Math.max(0, (bottom - top - rect.height) / 2);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: window.scrollY + rect.top - target, behavior: reduceMotion ? 'instant' : 'smooth' });
      moved = true;
    });
    return () => {
      cancelAnimationFrame(frame);
      if (moved) window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    };
  }, [index, scope]);

  return { readingRef, controlsRef };
}
