'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * 모바일 전용 하단 드로어.
 *
 * 좁은 화면에서는 그래프와 리더를 나란히 둘 공간이 없으므로, 노드를 고르면
 * 화면 아래에서 올라오는 시트로 노트를 보여준다. 그래프가 위쪽 절반에 계속
 * 보이기 때문에 맥락을 잃지 않는다.
 */
export default function MobileDrawer({ open, onClose, children }: MobileDrawerProps) {
  // 드로어가 열린 동안에는 뒤쪽 페이지가 스크롤되지 않게 한다.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[72vh] flex-col rounded-t-2xl border-t border-white/15 bg-slate-950/95 shadow-[0_-12px_40px_rgba(0,0,0,0.6)] backdrop-blur-lg transition-transform duration-300 ease-out ${
        open ? 'translate-y-0' : 'translate-y-full'
      }`}
      role="dialog"
      aria-hidden={!open}
      aria-label="노트 상세"
    >
      <div className="flex shrink-0 items-center justify-between px-3 pb-1 pt-2">
        <span className="mx-auto h-1 w-10 rounded-full bg-white/20" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-2 top-2 rounded p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
