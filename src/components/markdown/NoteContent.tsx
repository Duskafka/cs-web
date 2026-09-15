export interface NoteContentProps {
  /** 빌드 타임에 remark/rehype 로 렌더된 HTML. */
  html: string;
}

/**
 * 노트 본문 렌더러.
 *
 * 본문은 빌드 타임에 이미 HTML 로 변환돼 있으므로 클라이언트에 마크다운 파서를
 * 실어 보낼 필요가 없다. 본문 안에는 노트 사이 링크를 만들지 않는다. 연결은
 * 그래프와 리더 하단의 연결 목록으로만 드러낸다.
 */
export default function NoteContent({ html }: NoteContentProps) {
  return <div className="note-content" dangerouslySetInnerHTML={{ __html: html }} />;
}
