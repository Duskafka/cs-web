/**
 * 노트 본문을 훑어 연결을 다시 계산하고 `content/links.json` 에 쓴다.
 *
 * 실행: npm run scan:links
 *       npm run scan:links -- --check   (파일이 낡았으면 exit 1)
 *
 * 사람이 쓴 `exclude` / `extra` 는 건드리지 않고 그대로 옮긴다.
 */
import fs from 'node:fs';

import { getAllNotes } from '../src/lib/markdown';
import { scanLinks } from '../src/lib/keywordScan';
import { LINKS_PATH, readLinksFile } from '../src/lib/links';
import type { ScannedLink } from '../src/types/graph';

const check = process.argv.includes('--check');

const notes = await getAllNotes();
const previous = readLinksFile();

const excluded = new Set(previous.exclude.map(([source, target]) => `${source} -> ${target}`));
const scanned = scanLinks(notes).filter((link) => !excluded.has(`${link.source} -> ${link.target}`));

const label = (link: ScannedLink) => `${link.source} -> ${link.target}`;
const before = new Map(previous.links.map((link) => [label(link), link]));
const after = new Map(scanned.map((link) => [label(link), link]));

const added = [...after.values()].filter((link) => !before.has(label(link)));
const removed = [...before.values()].filter((link) => !after.has(label(link)));

console.log(`노트 ${notes.length}편 / 연결 ${scanned.length}개 (이전 ${previous.links.length}개)`);
if (previous.exclude.length > 0) console.log(`제외 규칙 ${previous.exclude.length}개 적용`);
if (previous.extra.length > 0) console.log(`수동 연결 ${previous.extra.length}개 (스캔과 별개)`);

console.log(`\n+ 추가 ${added.length}개`);
for (const link of added) console.log(`  + ${label(link)}  ("${link.keyword}" x${link.count})`);
console.log(`\n- 삭제 ${removed.length}개`);
for (const link of removed) console.log(`  - ${label(link)}  ("${link.keyword}" x${link.count})`);

if (check) {
  if (added.length === 0 && removed.length === 0) {
    console.log('\ncontent/links.json 은 최신입니다.');
    process.exit(0);
  }
  console.error('\ncontent/links.json 이 본문과 어긋납니다. npm run scan:links 를 실행하세요.');
  process.exit(1);
}

fs.writeFileSync(
  LINKS_PATH,
  `${JSON.stringify({ exclude: previous.exclude, extra: previous.extra, links: scanned }, null, 2)}\n`,
  'utf8',
);
console.log(`\ncontent/links.json 갱신 완료.`);
