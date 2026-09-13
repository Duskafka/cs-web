---
title: 브라우저 렌더링 파이프라인
category: frontend
tags: [렌더링, 리플로우, 페인트]
summary: HTML과 CSS가 화면 픽셀이 되기까지의 단계. 어느 단계를 건드리는지가 성능을 가른다.
created_at: 2025-02-11
aliases: [rendering pipeline, 렌더링 파이프라인, critical rendering path]
---

# 브라우저 렌더링 파이프라인

`HTML 파싱 → DOM` 과 `CSS 파싱 → CSSOM` 이 합쳐져 렌더 트리가 되고, 이후 세 단계를 거친다.

1. **Layout(Reflow)**: 각 요소의 위치와 크기를 계산한다. 가장 비싸다.
2. **Paint**: 픽셀을 칠한다.
3. **Composite**: 레이어를 합성한다. GPU 가 담당한다.

## 무엇을 바꾸느냐가 중요하다

`width`, `top` 같은 기하 속성을 바꾸면 Layout 부터 다시 한다. 반면 `transform` 과 `opacity` 는 Composite 만 다시 하므로 애니메이션은 이 둘로 해야 60fps 가 나온다.

## 파싱을 막는 것들

`<script>` 는 기본적으로 파서를 멈춘다. `defer` 나 `async` 로 이를 피한다. CSS 는 렌더링을 막으므로 중요한 스타일만 인라인하고 나머지는 나중에 불러온다.

## 연결

- 스크립트 실행과 렌더링은 같은 스레드에서 경쟁하며, 그 조정 규칙이 [[이벤트 루프]]다.
- 리소스 재요청을 줄이는 것이 [[브라우저 캐시]]의 역할이다.
- DOM 조작 횟수를 줄이려는 시도가 [[가상 DOM]]이다.
