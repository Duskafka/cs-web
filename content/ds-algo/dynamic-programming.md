---
title: 동적 계획법
category: ds-algo
tags: [DP, 최적화, 메모이제이션]
summary: 겹치는 부분 문제의 답을 저장해 재계산을 없애는 설계 기법.
created_at: 2025-01-12
aliases: [DP, dynamic programming]
---

# 동적 계획법

두 조건이 성립할 때 쓴다.

1. **최적 부분 구조**: 큰 문제의 최적해가 작은 문제의 최적해로 구성된다.
2. **겹치는 부분 문제**: 같은 작은 문제가 반복해서 나타난다.

## 두 가지 구현 방향

- **Top-down (메모이제이션)**: 재귀 + 캐시. 캐시는 보통 [[해시 테이블]]이나 배열이다.
- **Bottom-up (타뷸레이션)**: 반복문으로 작은 문제부터 채운다. 호출 스택을 안 써서 안전하다.

```python
def fib(n, memo={}):
    if n < 2: return n
    if n not in memo:
        memo[n] = fib(n - 1, memo) + fib(n - 2, memo)
    return memo[n]
```

## 연결

- 부분 문제 사이의 의존 관계는 방향 그래프이므로 [[그래프 탐색]]의 위상 정렬과 맞물린다.
- 계산 결과를 재사용한다는 점에서 [[캐싱 전략]]과 철학이 같다.
