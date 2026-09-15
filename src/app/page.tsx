import MindmapShell from '@/components/MindmapShell';
import { buildKnowledgePayload } from '@/lib/graphUtils';
import { getLinks } from '@/lib/links';
import { getAllNotes } from '@/lib/markdown';

/**
 * 메인 듀얼 뷰 페이지.
 *
 * 서버 컴포넌트에서 마크다운을 파싱하므로 파서와 파일 시스템 접근은 번들에
 * 포함되지 않는다. 콘텐츠가 저장소 안의 정적 파일뿐이라 빌드 타임에 한 번만
 * 렌더하면 되고, 그래서 정적 생성으로 고정한다.
 */
export const dynamic = 'force-static';

export default async function Page() {
  const notes = await getAllNotes();
  const payload = buildKnowledgePayload(notes, getLinks(notes));

  return <MindmapShell payload={payload} />;
}
