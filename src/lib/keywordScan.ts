import type { ScanNote, ScannedLink } from '@/types/graph';

/**
 * 키워드 스캔 규칙의 단일 출처.
 *
 * 노트 사이의 연결은 사람이 본문에 적는 것이 아니라, 각 노트가 스스로 선언한
 * 이름(frontmatter 의 `title` 과 `aliases`)이 다른 노트 본문에 등장하는지를
 * 훑어서 만들어낸다. 그래서 마크다운에는 내용만 남고, 연결은 스캔 결과로
 * `content/links.json` 에 저장된다.
 */

/** 정규식 메타문자 이스케이프. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const HANGUL = /[ㄱ-ㆎ가-힣]/;

/**
 * 키워드 하나를 찾는 정규식.
 *
 * 한글은 조사가 단어에 그대로 붙으므로(`프로세스가`, `프로세스를`) 경계를 걸면
 * 대부분을 놓친다. 반대로 영문에 경계를 걸지 않으면 `DP` 가 `UDP` 에, `tcp` 가
 * 무관한 단어에 걸린다. 그래서 문자 종류에 따라 규칙을 나눈다.
 */
function toPattern(keyword: string): RegExp {
  if (HANGUL.test(keyword)) return new RegExp(escapeRegExp(keyword), 'gi');

  // 영문은 단어 경계를 강제하고, 공백·하이픈·언더스코어 표기 차이는 흡수한다.
  const body = keyword
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(escapeRegExp)
    .join('[\\s_-]?');
  return new RegExp(`(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])`, 'gi');
}

interface Keyword {
  slug: string;
  word: string;
  pattern: RegExp;
}

/** 각 노트가 선언한 이름들을 매칭용 키워드 목록으로 편다. */
function collectKeywords(notes: ScanNote[]): Keyword[] {
  const keywords: Keyword[] = [];
  for (const note of notes) {
    for (const word of [note.title, ...note.aliases]) {
      const trimmed = word?.trim();
      // 한 글자짜리는 어느 본문에나 걸려서 신호가 되지 못한다.
      if (!trimmed || trimmed.length < 2) continue;
      keywords.push({ slug: note.slug, word: trimmed, pattern: toPattern(trimmed) });
    }
  }
  return keywords;
}

/**
 * 모든 노트를 훑어 `A 의 본문이 B 의 이름을 언급한다` 형태의 간선을 만든다.
 *
 * 방향은 유지한다. 백링크("이 노트를 언급한 노트")가 그 방향에 기대기 때문이다.
 *
 * ponytail: 본문은 검색용 평문(`Note.plain`)을 그대로 쓴다. 코드 블록이 이미
 * 제외되어 있어 공짜지만, 평문은 텍스트 노드를 공백으로 이어 붙이므로 키워드가
 * `**강조**` 경계를 가로지르면 놓친다. 놓치는 사례가 눈에 띄면 그때 본문 AST 를
 * 직접 훑도록 바꾼다.
 */
export function scanLinks(notes: ScanNote[]): ScannedLink[] {
  const keywords = collectKeywords(notes);
  const links: ScannedLink[] = [];

  for (const note of notes) {
    // 같은 대상을 여러 별칭이 가리킬 수 있으므로 대상별로 가장 많이 걸린 것만 남긴다.
    const best = new Map<string, ScannedLink>();

    for (const keyword of keywords) {
      if (keyword.slug === note.slug) continue;

      keyword.pattern.lastIndex = 0;
      const count = note.plain.match(keyword.pattern)?.length ?? 0;
      if (count === 0) continue;

      const previous = best.get(keyword.slug);
      if (previous && previous.count >= count) continue;
      best.set(keyword.slug, {
        source: note.slug,
        target: keyword.slug,
        keyword: keyword.word,
        count,
      });
    }

    links.push(...[...best.values()].sort((a, b) => a.target.localeCompare(b.target)));
  }

  return links;
}
