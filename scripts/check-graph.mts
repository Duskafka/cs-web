/**
 * 파싱 파이프라인 단독 검증 스크립트.
 * 실행: npx tsx scripts/check-graph.ts
 */
import { getAllNotes } from '../src/lib/markdown';
import { buildKnowledgePayload, endpointId } from '../src/lib/graphUtils';
import { getLinks } from '../src/lib/links';
import { getRetroEntries } from '../src/lib/retro';

const notes = await getAllNotes();
const payload = buildKnowledgePayload(notes, getLinks(notes));
const { graph, stats, backlinks } = payload;

console.log('=== 통계 ===');
console.log(stats);

console.log('\n=== 카테고리별 노드 ===');
for (const [cat, count] of Object.entries(stats.countByCategory)) {
  console.log(`  ${cat}: ${count}`);
}

const orphans = graph.nodes.filter(
  (n) => !graph.links.some((l) => endpointId(l.source) === n.id || endpointId(l.target) === n.id),
);
console.log('\n=== 고아 노드 ===');
console.log(orphans.length === 0 ? '  없음' : orphans.map((n) => '  ' + n.id).join('\n'));

console.log('\n=== 양방향 간선 ===');
const bi = graph.links.filter((l) => l.bidirectional);
console.log(`  ${bi.length}개`);
for (const l of bi) console.log(`  ${endpointId(l.source)} <-> ${endpointId(l.target)}`);

console.log('\n=== 카테고리 교차 간선 수 ===');
const catOf = new Map(graph.nodes.map((n) => [n.id, n.category]));
const cross = graph.links.filter((l) => catOf.get(endpointId(l.source)) !== catOf.get(endpointId(l.target)));
console.log(`  ${cross.length} / ${graph.links.length}`);

console.log('\n=== degree 상위 8 ===');
[...graph.nodes].sort((a, b) => b.val - a.val).slice(0, 8)
  .forEach((n) => console.log(`  ${n.val.toString().padStart(2)}  ${n.id}`));

const sample = notes.find((n) => n.slug === 'os/deadlock')!;
console.log('\n=== 백링크 샘플 (os/deadlock) ===');
console.log(`  <- ${(backlinks[sample.slug] ?? []).join(', ')}`);
console.log('\n=== plain 샘플 ===');
console.log(sample.plain.slice(0, 180));

console.log('\n=== 회고록 ===');
const retro = await getRetroEntries();
console.log(`  ${retro.length}편 (오래된 순)`);
for (const entry of retro) {
  console.log(`  ${entry.date || '(날짜 없음)'}  ${entry.slug}  "${entry.title}"`);
}
const badRetro = retro.filter((entry) => !entry.date || !entry.html.trim());
console.log(
  badRetro.length === 0
    ? '  경고 없음'
    : badRetro.map((entry) => `  ! ${entry.slug}: 날짜나 본문이 비었다`).join('\n'),
);
