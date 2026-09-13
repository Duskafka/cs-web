import type { WikiLinkRef } from '@/types/graph';

/**
 * 위키링크 파싱 규칙의 단일 출처.
 *
 * 그래프 간선 추출(graphUtils)과 리더 본문 렌더링(remarkWikiLink)이 모두 이 모듈을
 * 사용한다. 두 곳이 서로 다른 규칙을 쓰면 "리더에는 링크로 보이는데 그래프에는
 * 간선이 없는" 불일치가 생기므로, 정규식과 정규화 함수를 여기에만 둔다.
 */

/**
 * `[[대상]]`, `[[대상|별칭]]`, `[[대상#헤딩]]`, `[[대상#헤딩|별칭]]` 을 모두 매칭한다.
 * 캡처 1 = 대상, 캡처 2 = 헤딩(버림), 캡처 3 = 별칭.
 */
export const WIKILINK_PATTERN = /\[\[([^[\]|#]+)(#[^[\]|]*)?(?:\|([^[\]]+))?\]\]/g;

/**
 * 매칭 키 정규화.
 * 대소문자, 앞뒤 공백, 연속 공백, 하이픈/언더스코어 차이를 흡수해서
 * `[[TCP/IP]]`, `[[tcp-ip]]`, `[[TCP IP]]` 가 같은 노트를 가리키게 한다.
 */
export function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/** 고스트 노드의 그래프 ID. 실제 slug 와 절대 충돌하지 않도록 접두사를 붙인다. */
export function ghostId(key: string): string {
  return `ghost:${key}`;
}

/** 텍스트에서 위키링크를 모두 추출한다. 중복 대상은 한 번만 반환한다. */
export function extractWikiLinks(text: string): WikiLinkRef[] {
  const found = new Map<string, WikiLinkRef>();

  // 정규식이 전역 플래그를 쓰므로 호출마다 lastIndex 를 초기화한다.
  WIKILINK_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_PATTERN.exec(text)) !== null) {
    const target = match[1].trim();
    if (!target) continue;
    const key = normalizeKey(target);
    if (found.has(key)) continue;
    found.set(key, { target, alias: (match[3] ?? target).trim(), key });
  }

  return [...found.values()];
}
