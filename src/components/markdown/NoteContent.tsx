'use client';

import { useCallback } from 'react';

export interface NoteContentProps {
  /** 빌드 타임에 remark/rehype 로 렌더된 HTML. */
  html: string;
  /** 위키링크 클릭 시 호출. slug 가 빈 문자열이면 고스트(미작성) 링크다. */
  onNavigate: (slug: string, ghostKey: string) => void;
}

/**
 * 노트 본문 렌더러.
 *
 * 본문은 빌드 타임에 이미 HTML 로 변환돼 있으므로 클라이언트에 마크다운 파서를
 * 실어 보낼 필요가 없다. 대신 위키링크 앵커를 클릭 가능한 동작으로 되살려야 하는데,
 * 앵커마다 React 핸들러를 붙일 수 없으므로 컨테이너에서 이벤트를 위임 처리한다.
 */
export default function NoteContent({ html, onNavigate }: NoteContentProps) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const anchor = (event.target as HTMLElement).closest('a.wikilink');
      if (!anchor) return;

      // href 는 "#" 이라 기본 동작은 페이지 최상단으로 점프할 뿐이다. 막는다.
      event.preventDefault();
      onNavigate(
        anchor.getAttribute('data-slug') ?? '',
        anchor.getAttribute('data-key') ?? '',
      );
    },
    [onNavigate],
  );

  return (
    <div
      className="note-content"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
