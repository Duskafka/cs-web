'use client';

import { useEffect, useState } from 'react';

/**
 * CSS 미디어 쿼리 결과를 구독한다.
 *
 * 서버 렌더와 첫 클라이언트 렌더에서는 항상 `false` 를 돌려준다. 서버에는
 * 뷰포트가 없으므로 추측한 값을 쓰면 하이드레이션 불일치가 나기 때문이다.
 * 실제 값은 마운트 직후 effect 에서 채워진다.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** 마운트 완료 여부. SSR 에서 렌더하면 안 되는 WebGL 캔버스를 가드할 때 쓴다. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** 컨테이너의 실측 크기. force-graph 는 width/height 를 픽셀로 받아야 한다. */
export function useElementSize<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize({ width: Math.round(box.width), height: Math.round(box.height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
