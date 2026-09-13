'use client';

import { PanelRightClose } from 'lucide-react';

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  /** 검색 + 필터 등 상단 고정 영역. */
  controls: React.ReactNode;
  /** 노트 리더 등 스크롤되는 본문 영역. */
  children: React.ReactNode;
}

/**
 * 데스크톱용 우측 접이식 패널.
 *
 * 3D 캔버스와 상태를 공유하지 않도록 UI 만 담당한다 (CLAUDE.md 컴포넌트 분리 규칙).
 * 접었다 펴는 동안 캔버스 폭이 바뀌면 ResizeObserver 가 크기를 다시 잡아준다.
 */
export default function Sidebar({ open, onClose, controls, children }: SidebarProps) {
  return (
    <aside
      aria-hidden={!open}
      className={`flex h-full shrink-0 flex-col border-l border-white/10 bg-slate-950/70 backdrop-blur transition-[width] duration-300 ease-out ${
        open ? 'w-[22rem] xl:w-[26rem]' : 'w-0 overflow-hidden border-l-0'
      }`}
    >
      <div className="flex w-[22rem] shrink-0 flex-col gap-3 border-b border-white/10 p-4 xl:w-[26rem]">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{controls}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="사이드바 접기"
            className="mt-0.5 shrink-0 rounded p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 w-[22rem] flex-1 xl:w-[26rem]">{children}</div>
    </aside>
  );
}
