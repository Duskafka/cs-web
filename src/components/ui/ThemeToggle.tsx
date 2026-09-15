'use client';

import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

import { useSettingsStore } from '@/store/settingsStore';

/**
 * 데이모드 ↔ 다크모드 전환 버튼.
 *
 * 마인드맵과 회고록 헤더 양쪽에 같은 버튼을 둔다. 선택한 값은 localStorage 에 남고,
 * 다음 방문의 첫 페인트는 layout.tsx 의 인라인 스크립트가 맡는다.
 */
export default function ThemeToggle() {
  const theme = useSettingsStore((state) => state.theme);
  const hydrated = useSettingsStore((state) => state.hydrated);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const setTheme = useSettingsStore((state) => state.setTheme);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? '데이모드로 전환' : '다크모드로 전환'}
      className="shrink-0 rounded p-1.5 text-faint transition hover:bg-hover hover:text-fg"
    >
      {/* 저장된 값을 읽기 전에 아이콘을 그리면 서버 렌더와 어긋난다. */}
      {hydrated ? (
        dark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )
      ) : (
        <span className="block h-4 w-4" />
      )}
    </button>
  );
}
