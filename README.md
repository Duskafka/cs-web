# CS 지식 뇌 지도

로컬 마크다운 CS 노트를 파싱해 `[[위키링크]]`를 간선으로 삼고, CS 도메인을 3D 뇌엽
위치에 클러스터링해 보여주는 지식 그래프 사이트입니다.

## 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 정적 생성 빌드
```

## 검증

```bash
npm run typecheck    # 타입 검사
npm run lint         # ESLint
npm run check:graph  # 마크다운 파싱 결과(노드/간선/고스트/고아) 점검
```

`check:graph` 는 페이지를 띄우지 않고 파싱 파이프라인만 돌려 노드 수, 간선 수,
고스트 노드 목록, 고아 노드, 카테고리 교차 간선 수를 출력합니다. 노트를 추가한 뒤
의도한 대로 연결됐는지 확인할 때 씁니다.

## 노트 작성 규칙

`content/<카테고리>/<슬러그>.md` 로 만들고 frontmatter 를 채웁니다.

```markdown
---
title: 데드락
category: os
tags: [동시성, 교착상태]
summary: 한 줄 요약. 툴팁과 리더 상단에 표시됩니다.
created_at: 2025-01-18
aliases: [deadlock, 교착 상태]
---

본문에서 [[프로세스]] 처럼 쓰면 그래프 간선이 생깁니다.
[[프로세스|다른 이름으로]] 표기하거나 [[프로세스#상태 전이]] 처럼 헤딩을 붙여도 됩니다.
```

- `category` 는 `ds-algo`, `os`, `network`, `database`, `frontend`, `architecture`
  중 하나입니다. 비워두면 디렉터리 이름으로 추론합니다. 카테고리와 뇌엽의 대응은
  `src/lib/brainLobeMap.ts` 에 정의돼 있습니다.
- 위키링크 대상은 제목 → 별칭 → 파일명 순으로 해석합니다. 대소문자와 공백/하이픈
  차이는 무시합니다.
- 대상 노트가 없으면 **고스트 노드**(반투명 와이어프레임)가 생깁니다. 아직 쓰지
  않았지만 이미 언급된 주제를 드러내기 위한 장치이므로 오류가 아닙니다.
- 코드 블록과 인라인 코드 안의 대괄호는 위키링크로 해석되지 않습니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `src/lib/wikilink.ts` | 위키링크 정규식과 키 정규화 (파서·렌더러 공통) |
| `src/lib/markdown.ts` | `content/**/*.md` 스캔, frontmatter 파싱, 본문 HTML 렌더 |
| `src/lib/graphUtils.ts` | 노드·간선·역링크·통계 생성 |
| `src/lib/brainLobeMap.ts` | 카테고리 ↔ 뇌엽 좌표·색상 매핑 |
| `src/components/3d/forces.ts` | 뇌 형태를 만드는 커스텀 d3 힘 |
| `src/components/3d/BrainGraphCanvas.tsx` | 데스크톱 3D 캔버스 |
| `src/components/3d/BrainGraph2DCanvas.tsx` | 모바일 2D 폴백 (768px 미만) |
| `src/app/api/graph/route.ts` | 그래프 JSON 정적 엔드포인트 |

마크다운 파싱은 전부 서버 컴포넌트에서 빌드 타임에 일어나므로, 파서와 파일 시스템
접근 코드는 클라이언트 번들에 포함되지 않습니다.
