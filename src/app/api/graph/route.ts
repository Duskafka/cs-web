import { NextResponse } from 'next/server';
import { buildKnowledgePayload } from '@/lib/graphUtils';
import { getLinks } from '@/lib/links';
import { getAllNotes } from '@/lib/markdown';

/**
 * 그래프 데이터 정적 엔드포인트.
 *
 * 페이지는 페이로드를 props 로 직접 받으므로 화면 동작에는 필요 없다.
 * 외부 도구나 스크립트가 그래프 구조만 가져갈 수 있게 열어둔 출구이며,
 * 콘텐츠가 빌드 타임 고정값이라 정적 파일로 미리 생성한다.
 */
export const dynamic = 'force-static';

export async function GET() {
  const notes = await getAllNotes();
  const { graph, stats, backlinks, outlinks } = buildKnowledgePayload(notes, getLinks(notes));

  // 본문 HTML 은 응답에서 뺀다. 그래프 구조만으로도 크기가 충분히 크고,
  // 본문은 어차피 페이지 페이로드로 전달되기 때문이다.
  return NextResponse.json({ graph, stats, backlinks, outlinks });
}
