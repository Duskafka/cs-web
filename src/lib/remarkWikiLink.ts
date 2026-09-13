import { visit } from 'unist-util-visit';
import type { Root, Text, PhrasingContent, Parent } from 'mdast';
import { WIKILINK_PATTERN, normalizeKey } from '@/lib/wikilink';

/** 위키링크 대상 키를 실제 노트 slug 로 바꾸는 함수. 없으면 null (= 고스트). */
export type WikiLinkResolver = (key: string) => string | null;

export interface RemarkWikiLinkOptions {
  resolve: WikiLinkResolver;
}

/**
 * 본문의 `[[대상]]` 을 클릭 가능한 앵커로 바꾸는 remark 플러그인.
 *
 * `text` 노드만 순회하므로 코드 블록(`code`)과 인라인 코드(`inlineCode`) 안의
 * 대괄호는 건드리지 않는다. 그래프 간선 추출도 같은 규칙을 써야 하므로
 * graphUtils 는 이 플러그인이 만들어낸 outgoing 목록을 그대로 사용한다.
 *
 * 앵커는 href 대신 `data-slug` 로 대상을 전달한다. 라우팅이 아니라 3D 그래프의
 * 선택 상태를 바꾸는 것이 목적이라 페이지 이동이 일어나면 안 되기 때문이다.
 */
export default function remarkWikiLink(options: RemarkWikiLinkOptions) {
  const { resolve } = options;

  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (!node.value.includes('[[')) return;

      const replacement: PhrasingContent[] = [];
      let cursor = 0;

      WIKILINK_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = WIKILINK_PATTERN.exec(node.value)) !== null) {
        const target = match[1].trim();
        if (!target) continue;

        if (match.index > cursor) {
          replacement.push({ type: 'text', value: node.value.slice(cursor, match.index) });
        }

        const key = normalizeKey(target);
        const slug = resolve(key);
        const alias = (match[3] ?? target).trim();

        replacement.push({
          type: 'link',
          url: '#',
          children: [{ type: 'text', value: alias }],
          data: {
            hName: 'a',
            hProperties: {
              href: '#',
              className: slug ? ['wikilink'] : ['wikilink', 'wikilink-ghost'],
              // 고스트 링크는 대상 키를 넘겨 "아직 없는 노트" 안내를 띄운다.
              'data-slug': slug ?? '',
              'data-ghost': slug ? 'false' : 'true',
              'data-key': key,
              title: slug ? alias : `${target} — 아직 작성되지 않은 노트`,
            },
          },
        });

        cursor = match.index + match[0].length;
      }

      if (replacement.length === 0) return;
      if (cursor < node.value.length) {
        replacement.push({ type: 'text', value: node.value.slice(cursor) });
      }

      parent.children.splice(index, 1, ...replacement);
      // 새로 삽입한 노드들은 이미 처리된 것이므로 그 다음부터 순회를 재개한다.
      return index + replacement.length;
    });
  };
}
