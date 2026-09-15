'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import type { ContentWidth } from '@/store/settingsStore';

export interface NoteFullViewProps {
  open: boolean;
  /** 'reading' 은 읽기 좋은 폭으로 가두고, 'full' 은 좌우 여백을 최소로 둔다. */
  contentWidth: ContentWidth;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * 노트를 창 전체로 펼쳐 보여주는 화면.
 *
 * 별도 라우트를 만들지 않고 같은 페이지 위에 덮는다. 그래야 뒤로 가기나 주소가
 * 늘어나지 않고, 닫으면 그래프가 보던 각도 그대로 남는다.
 *
 * 바탕은 불투명하다. 뒤의 그래프가 비치면 글을 읽는 동안 계속 눈에 걸린다.
 * 본문 폭은 설정을 따른다. 기본값은 줄이 너무 길어지지 않는 읽기 폭이고,
 * 코드 블록이나 표가 많은 노트를 넓게 보고 싶으면 전체 폭으로 바꾼다.
 *
 * 폭 제한은 여기서 감싸지 않고 .note-column 클래스로 안쪽 열에만 건다.
 * 스크롤이 창 전체 폭에서 일어나야 스크롤바가 화면 오른쪽 끝에 붙기 때문이다.
 */
export default function NoteFullView({
  open,
  contentWidth,
  onClose,
  children,
}: NoteFullViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  /** 마운트 직후 한 프레임 뒤에 켜서 페이드가 보이게 한다. */
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    // preventScroll 이 없으면 브라우저가 포커스 대상을 보이게 하려고 본문을 스크롤한다.
    rootRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="노트 상세"
      tabIndex={-1}
      className={`fixed inset-0 z-40 flex flex-col bg-canvas outline-none transition-opacity duration-200 ${
        entered ? 'opacity-100' : 'opacity-0'
      } ${contentWidth === 'full' ? 'note-full' : ''}`}
    >
      <div className="flex shrink-0 justify-end px-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="rounded p-1.5 text-faint transition hover:bg-hover hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
    </div>
  );
}
