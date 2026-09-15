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

/**
 * 검색 인덱스와 키워드 스캔에 쓰는 평문.
 *
 * `code` 노드는 방문하지 않으므로 코드 블록 안의 단어는 연결 근거가 되지 않는다.
 * 코드 예제에 우연히 등장한 이름이 간선을 만들면 안 되기 때문이다.
 */
function toPlainText(tree: Root): string {
  const parts: string[] = [];
  visit(tree, (node) => {
    if (node.type === 'text' || node.type === 'inlineCode') {
      parts.push((node as { value: string }).value);
    }
  });
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** 마크다운 → HTML 프로세서. */
function createProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeHighlight, { detect: true, ignoreMissing: true })
    .use(rehypeStringify);
}

/** 노트 본문과 같은 규칙으로 임의의 마크다운을 렌더한다. 회고록이 쓴다. */
export async function markdownToHtml(body: string): Promise<string> {
  return String(await createProcessor().process(body));
}

/**
 * frontmatter 날짜를 문자열로 고정한다.
 *
 * YAML 파서는 따옴표 없는 `created_at: 2025-01-04` 를 Date 객체로 해석한다.
 * 그 값이 서버 컴포넌트 경계를 넘어 그대로 JSX 로 들어가면 React 가 렌더하지 못하고
 * 터지므로, 여기서 YYYY-MM-DD 문자열로 눌러둔다.
 */
export function toDateString(value: unknown): string {
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

let cached: Note[] | null = null;

/**
 * 모든 노트를 파싱해 HTML 까지 렌더한다.
 *
 * 빌드 타임(SSG)에 한 번만 실행되지만, dev 서버에서는 페이지 렌더마다 불리므로
 * 모듈 스코프에 캐시한다.
 */
export async function getAllNotes(): Promise<Note[]> {
  if (cached) return cached;

  const processor = createProcessor();

  const notes: Note[] = [];
  for (const file of collectMarkdownFiles(CONTENT_ROOT).sort()) {
    const parsed = matter(fs.readFileSync(file, 'utf8'));
    const frontmatter = parsed.data as NoteFrontmatter;
    const slug = toSlug(file);

    const tree = processor.parse(parsed.content) as Root;
    const plain = toPlainText(tree);
    const html = processor.stringify(await processor.run(tree));

    const fallbackTitle = slug.split('/').pop() ?? slug;
    notes.push({
      slug,
      title: (frontmatter.title ?? fallbackTitle).trim(),
      // 카테고리는 frontmatter 를 우선하되, 없으면 디렉터리 이름으로 추론한다.
      category: toCategoryId(frontmatter.category ?? slug.split('/')[0]),
      tags: toStringArray(frontmatter.tags),
      aliases: toStringArray(frontmatter.aliases),
      summary: (frontmatter.summary ?? '').trim(),
      createdAt: toDateString(frontmatter.created_at),
      html: String(html),
      plain,
    });
  }

  notes.sort((a, b) => a.slug.localeCompare(b.slug));
  cached = notes;
  return notes;
}
