import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

import remarkWikiLink from '@/lib/remarkWikiLink';
import { extractWikiLinks, normalizeKey } from '@/lib/wikilink';
import { toCategoryId } from '@/lib/brainLobeMap';
import type { Note, NoteFrontmatter } from '@/types/graph';

/** 마크다운 노트 루트. 저장소 루트 기준 `content/`. */
const CONTENT_ROOT = path.join(process.cwd(), 'content');

/** `content/` 아래 모든 `.md` 파일 경로를 재귀 수집한다. */
function collectMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

/** 파일 경로 → `os/process` 형태의 slug. 윈도우 경로 구분자도 정규화한다. */
function toSlug(filePath: string): string {
  return path
    .relative(CONTENT_ROOT, filePath)
    .split(path.sep)
    .join('/')
    .replace(/\.md$/, '');
}

/** 검색 인덱스용 평문. 마크다운 기호와 위키링크 대괄호를 걷어낸다. */
function toPlainText(tree: Root): string {
  const parts: string[] = [];
  visit(tree, (node) => {
    if (node.type === 'text' || node.type === 'inlineCode') {
      parts.push((node as { value: string }).value);
    }
  });
  return parts
    .join(' ')
    .replace(/\[\[([^[\]|#]+)(?:#[^[\]|]*)?(?:\|([^[\]]+))?\]\]/g, (_m, target, alias) => alias ?? target)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * frontmatter 날짜를 문자열로 고정한다.
 *
 * YAML 파서는 따옴표 없는 `created_at: 2025-01-04` 를 Date 객체로 해석한다.
 * 그 값이 서버 컴포넌트 경계를 넘어 그대로 JSX 로 들어가면 React 가 렌더하지 못하고
 * 터지므로, 여기서 YYYY-MM-DD 문자열로 눌러둔다.
 */
function toDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

/** frontmatter 의 문자열 배열 필드를 방어적으로 읽는다. */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

interface RawNote {
  slug: string;
  frontmatter: NoteFrontmatter;
  body: string;
}

/** 1차 스캔: frontmatter 만 읽어 위키링크 해석 인덱스를 만든다. */
function readRawNotes(): RawNote[] {
  return collectMarkdownFiles(CONTENT_ROOT)
    .map((file) => {
      const parsed = matter(fs.readFileSync(file, 'utf8'));
      return {
        slug: toSlug(file),
        frontmatter: parsed.data as NoteFrontmatter,
        body: parsed.content,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * 위키링크 대상 → slug 해석 인덱스.
 *
 * 우선순위는 제목 > 별칭 > 파일명이다. 제목은 사람이 직접 쓰는 이름이므로
 * 충돌이 나면 제목이 이긴다. 파일명 항목 덕분에 `[[process]]` 처럼 slug 로
 * 적은 링크도 `os/process.md` 를 찾아간다.
 */
function buildResolveIndex(rawNotes: RawNote[]): Map<string, string> {
  const index = new Map<string, string>();

  const put = (name: string | undefined, slug: string, overwrite: boolean) => {
    if (!name) return;
    const key = normalizeKey(name);
    if (!key) return;
    if (!overwrite && index.has(key)) return;
    index.set(key, slug);
  };

  // 파일명과 전체 slug 를 먼저 넣고, 별칭·제목 순으로 덮어쓴다.
  for (const note of rawNotes) {
    put(note.slug, note.slug, false);
    put(note.slug.split('/').pop(), note.slug, false);
  }
  for (const note of rawNotes) {
    for (const alias of toStringArray(note.frontmatter.aliases)) put(alias, note.slug, true);
  }
  for (const note of rawNotes) {
    put(note.frontmatter.title ?? note.slug.split('/').pop(), note.slug, true);
  }

  return index;
}

let cached: Note[] | null = null;

/**
 * 모든 노트를 파싱해 HTML 까지 렌더한다.
 *
 * 빌드 타임(SSG)에 한 번만 실행되지만, dev 서버에서는 페이지 렌더마다 불리므로
 * 모듈 스코프에 캐시한다.
 */
export async function getAllNotes(): Promise<Note[]> {
  if (cached) return cached;

  const rawNotes = readRawNotes();
  const index = buildResolveIndex(rawNotes);
  const resolve = (key: string) => index.get(key) ?? null;

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkWikiLink, { resolve })
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeHighlight, { detect: true, ignoreMissing: true })
    .use(rehypeStringify);

  const notes: Note[] = [];
  for (const raw of rawNotes) {
    const tree = processor.parse(raw.body) as Root;
    // 위키링크 플러그인이 text 노드를 앵커로 바꾸기 전에 평문을 먼저 뽑는다.
    const plain = toPlainText(tree);
    const html = processor.stringify(await processor.run(tree));

    const fallbackTitle = raw.slug.split('/').pop() ?? raw.slug;
    notes.push({
      slug: raw.slug,
      title: (raw.frontmatter.title ?? fallbackTitle).trim(),
      // 카테고리는 frontmatter 를 우선하되, 없으면 디렉터리 이름으로 추론한다.
      category: toCategoryId(raw.frontmatter.category ?? raw.slug.split('/')[0]),
      tags: toStringArray(raw.frontmatter.tags),
      summary: (raw.frontmatter.summary ?? '').trim(),
      createdAt: toDateString(raw.frontmatter.created_at),
      html: String(html),
      plain,
      outgoing: extractWikiLinks(raw.body),
    });
  }

  cached = notes;
  return notes;
}
