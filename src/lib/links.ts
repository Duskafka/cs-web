import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

import { scanLinks } from '@/lib/keywordScan';
import type { LinksFile, Note, ScannedLink } from '@/types/graph';

/**
 * 노트 사이의 연결 저장소.
 *
 * 연결은 마크다운 본문이 아니라 `content/links.json` 에 있다. 그 파일은
 * `npm run scan:links` 가 만들어내고, 사람은 `exclude` 와 `extra` 로만 손댄다.
 */
export const LINKS_PATH = path.join(process.cwd(), 'content', 'links.json');

const EMPTY: LinksFile = { exclude: [], extra: [], links: [] };

/** 저장된 연결 파일을 읽는다. 없으면 빈 파일로 취급한다. */
export function readLinksFile(): LinksFile {
  if (!fs.existsSync(LINKS_PATH)) return { ...EMPTY };

  const parsed = JSON.parse(fs.readFileSync(LINKS_PATH, 'utf8')) as Partial<LinksFile>;
  return {
    exclude: parsed.exclude ?? [],
    extra: parsed.extra ?? [],
    links: parsed.links ?? [],
  };
}

/** `exclude` 조회용 키. */
function pairKey(source: string, target: string): string {
  return `${source} -> ${target}`;
}

/** `exclude` 를 걷어내고 `extra` 를 더한 최종 연결 목록. */
export function applyOverrides(file: LinksFile): ScannedLink[] {
  const excluded = new Set(file.exclude.map(([source, target]) => pairKey(source, target)));
  const result = file.links.filter((link) => !excluded.has(pairKey(link.source, link.target)));

  const seen = new Set(result.map((link) => pairKey(link.source, link.target)));
  for (const [source, target] of file.extra) {
    if (seen.has(pairKey(source, target))) continue;
    result.push({ source, target, keyword: '(수동)', count: 0 });
  }

  return result;
}

/**
 * 그래프가 쓸 연결 목록.
 *
 * 스캔을 아직 돌리지 않았으면 즉석에서 계산한다. 그래야 `content/` 에 노트를
 * 새로 떨어뜨린 개발 환경이 빈 그래프를 보여주지 않는다.
 */
export function getLinks(notes: Note[]): ScannedLink[] {
  const file = readLinksFile();
  if (file.links.length === 0) return applyOverrides({ ...file, links: scanLinks(notes) });
  return applyOverrides(file);
}
