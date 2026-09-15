import { create } from 'zustand';

/** 그래프를 그리는 방식. */
export type RenderMode = '3d' | '2d';

/** 노트를 전체 화면으로 폈을 때 본문이 차지하는 폭. */
export type ContentWidth = 'reading' | 'full';

/** 화면 테마. 기본값은 데이모드다. */
export type Theme = 'light' | 'dark';

export interface Settings {
  renderMode: RenderMode;
  contentWidth: ContentWidth;
  theme: Theme;
}

interface SettingsState extends Settings {
  /**
   * 저장된 값을 읽어 왔는지.
   *
   * 서버에는 localStorage 가 없으므로 첫 렌더는 항상 기본값으로 그린다.
   * 캔버스를 이 값이 참이 된 뒤에 띄워야, 3D 로 그렸다가 2D 로 갈아엎는
   * 낭비(WebGL 컨텍스트 생성 후 폐기)가 생기지 않는다.
   */
  hydrated: boolean;
  hydrate: () => void;
  setRenderMode: (mode: RenderMode) => void;
  setContentWidth: (width: ContentWidth) => void;
  setTheme: (theme: Theme) => void;
}

/** layout.tsx 의 깜빡임 방지 스크립트도 이 키를 읽는다. 바꾸면 양쪽을 함께 고친다. */
export const STORAGE_KEY = 'cs-brain-map:settings';

/** 테마는 <html> 의 클래스로 드러난다. CSS 변수는 그 클래스를 보고 갈린다. */
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/** 좁은 화면에서는 WebGL 이 GPU 와 배터리에 부담이 크므로 2D 로 시작한다. */
function defaultRenderMode(): RenderMode {
  if (typeof window === 'undefined') return '3d';
  return window.matchMedia('(max-width: 767px)').matches ? '2d' : '3d';
}

/** 저장소는 시크릿 창이나 차단 설정에서 막힐 수 있으므로 실패를 삼킨다. */
function readStored(): Partial<Settings> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Settings>) : {};
  } catch {
    return {};
  }
}

function persist({ renderMode, contentWidth, theme }: Settings) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ renderMode, contentWidth, theme }),
    );
  } catch {
    // 저장에 실패해도 이번 세션 동작에는 영향이 없다.
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  renderMode: '3d',
  contentWidth: 'reading',
  theme: 'light',
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const stored = readStored();
    set({
      renderMode: stored.renderMode ?? defaultRenderMode(),
      contentWidth: stored.contentWidth ?? 'reading',
      theme: stored.theme ?? 'light',
      hydrated: true,
    });
  },

  setRenderMode: (renderMode) => {
    set({ renderMode });
    persist(get());
  },

  setContentWidth: (contentWidth) => {
    set({ contentWidth });
    persist(get());
  },

  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
    persist(get());
  },
}));
