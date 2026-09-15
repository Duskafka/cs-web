import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

import { markdownToHtml, toDateString } from '@/lib/markdown';

/** 회고록 루트. 저장소 루트 기준 `retro/`. CS 노트와 달리 하위 분류가 없다. */
const RETRO_ROOT = path.join(process.cwd(), 'retro');

/** 파일명 앞에 붙은 YYYY-MM-DD. frontmatter 에 date 가 없을 때의 폴백이다. */
const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

/** 타임라인에 점 하나로 찍히는 회고 글 한 편. */
export interface RetroEntry {
  /** 확장자 없는 파일명. */
  slug: string;
  title: string;
  /** YYYY-MM-DD. 알 수 없으면 빈 문자열. */
  date: string;
  summary: string;
  /** 미리 렌더된 본문 HTML. */
  html: string;
}

let cached: RetroEntry[] | null = null;

/**
 * `retro/*.md` 를 모두 읽어 날짜 오름차순으로 돌려준다.
 *
 * 오래된 글이 위, 새 글이 아래다. 타임라인 선이 아래로 자라면서 점이 붙는 모양이다.
 * 빌드 타임에 한 번만 돌지만 dev 서버는 렌더마다 부르므로 모듈 스코프에 캐시한다.
 */
export async function getRetroEntries(): Promise<RetroEntry[]> {
  if (cached) return cached;
  if (!fs.existsSync(RETRO_ROOT)) return (cached = []);

  const files = fs
    .readdirSync(RETRO_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name);

  const entries: RetroEntry[] = [];
  for (const name of files) {
    const parsed = matter(fs.readFileSync(path.join(RETRO_ROOT, name), 'utf8'));
    const data = parsed.data as { title?: string; date?: unknown; summary?: string };
    const slug = name.replace(/\.md$/, '');

    entries.push({
      slug,
      title: (data.title ?? slug).trim(),
      date: toDateString(data.date) || (DATE_PREFIX.exec(slug)?.[1] ?? ''),
      summary: (data.summary ?? '').trim(),
      html: await markdownToHtml(parsed.content),
    });
  }

  // 날짜가 같거나 비어 있으면 slug 로 갈라 순서를 고정한다.
  entries.sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
  return (cached = entries);
}
