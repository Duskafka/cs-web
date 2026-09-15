'use client';

import { PanelRightClose } from 'lucide-react';

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  /** 검색 + 필터 영역. */
  controls: React.ReactNode;
}

/**
 * 데스크톱용 우측 접이식 패널. 검색과 카테고리 필터만 담는다.
 * 노트 본문은 중앙 모달(NoteModal)이 맡는다.
 *
 * 3D 캔버스와 상태를 공유하지 않도록 UI 만 담당한다 (CLAUDE.md 컴포넌트 분리 규칙).
 * 접었다 펴는 동안 캔버스 폭이 바뀌면 ResizeObserver 가 크기를 다시 잡아준다.
 */
export default function Sidebar({ open, onClose, controls }: SidebarProps) {
  return (
    <aside
      aria-hidden={!open}
      className={`flex h-full shrink-0 flex-col border-l border-line bg-surface/80 backdrop-blur transition-[width] duration-300 ease-out ${
        open ? 'w-[22rem] xl:w-[26rem]' : 'w-0 overflow-hidden border-l-0'
      }`}
    >
      <div className="flex w-[22rem] shrink-0 flex-col gap-3 border-b border-line p-4 xl:w-[26rem]">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{controls}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="사이드바 접기"
            className="mt-0.5 shrink-0 rounded p-1.5 text-faint transition hover:bg-hover hover:text-fg"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
