/**
 * 키워드 매칭 규칙 자체 검증.
 * 실행: npm run test:scan
 *
 * 연결이 전부 이 규칙에서 나오므로, 규칙이 조용히 깨지면 그래프 전체가 틀어진다.
 * 그래서 실제 콘텐츠와 무관하게 규칙만 따로 못박아둔다.
 */
import assert from 'node:assert/strict';

import { scanLinks } from '../src/lib/keywordScan';
import { applyOverrides } from '../src/lib/links';
import type { ScanNote } from '../src/types/graph';

const note = (slug: string, title: string, aliases: string[], plain: string): ScanNote => ({
  slug,
  title,
  aliases,
  plain,
});

const pairs = (notes: ScanNote[]) =>
  scanLinks(notes).map((link) => `${link.source} -> ${link.target}`);

// 한글은 조사가 붙어도 잡아야 한다.
assert.deepEqual(
  pairs([
    note('os/process', '프로세스', [], '독립된 주소 공간을 갖는다.'),
    note('os/thread', '스레드', [], '프로세스가 스레드를 여럿 갖는다.'),
  ]),
  ['os/thread -> os/process'],
);

// 영문은 단어 경계를 지켜야 한다. DP 가 UDP 안에 걸리면 안 된다.
assert.deepEqual(
  pairs([
    note('ds-algo/dp', '동적 계획법', ['DP'], '부분 문제를 재사용한다.'),
    note('network/tcp-ip', 'TCP/IP', ['tcp'], 'UDP 는 비연결형이다.'),
  ]),
  [],
);

// 영문 표기의 공백·하이픈 차이는 흡수한다.
assert.deepEqual(
  pairs([
    note('network/lb', '로드 밸런싱', ['load balancing'], '트래픽을 나눈다.'),
    note('backend/api', 'REST API', [], 'load-balancing 뒤에 둔다.'),
  ]),
  ['backend/api -> network/lb'],
);

// 한 글자 키워드와 자기 자신으로 가는 연결은 만들지 않는다.
assert.deepEqual(
  pairs([
    note('a/x', 'X', [], 'X 를 다룬다. Y 도 본다.'),
    note('a/y', 'Y', [], 'Y 만 다룬다.'),
  ]),
  [],
);

// 같은 대상을 여러 별칭이 가리키면 가장 많이 걸린 근거만 남긴다.
const best = scanLinks([
  note('db/tx', '트랜잭션', ['transaction'], '원자성.'),
  note('db/iso', '격리 수준', [], '트랜잭션 트랜잭션 은 transaction 이다.'),
]);
assert.equal(best.length, 1);
assert.equal(best[0].keyword, '트랜잭션');
assert.equal(best[0].count, 2);

// exclude 는 연결을 걷어내고, extra 는 더한다.
assert.deepEqual(
  applyOverrides({
    exclude: [['a', 'b']],
    extra: [['c', 'd']],
    links: [
      { source: 'a', target: 'b', keyword: '오탐', count: 1 },
      { source: 'a', target: 'c', keyword: '진짜', count: 1 },
    ],
  }).map((link) => `${link.source} -> ${link.target}`),
  ['a -> c', 'c -> d'],
);

console.log('키워드 스캔 규칙 검증 통과');
