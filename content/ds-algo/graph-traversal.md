---
title: 그래프 탐색
category: ds-algo
tags: [그래프, DFS, BFS]
summary: DFS와 BFS로 정점과 간선을 빠짐없이 순회하는 기법. 최단 경로와 사이클 탐지의 기반.
created_at: 2025-01-08
aliases: [DFS, BFS, graph traversal]
---

# 그래프 탐색

정점(vertex)과 간선(edge)으로 이뤄진 그래프를 빠짐없이 방문하는 방법이다.

- **DFS(깊이 우선)**: 스택 또는 재귀. 경로 존재 여부, 사이클 탐지, 위상 정렬에 쓴다.
- **BFS(너비 우선)**: 큐. 간선 가중치가 모두 같을 때 최단 경로를 준다.

```python
from collections import deque

def bfs(graph, start):
    visited, queue = {start}, deque([start])
    while queue:
        node = queue.popleft()
        for nxt in graph[node]:
            if nxt not in visited:
                visited.add(nxt)
                queue.append(nxt)
    return visited
```

## 실무에서 만나는 곳

- 데드락 탐지는 자원 할당 그래프에서 사이클을 찾는 DFS 다.
- 이 사이트의 지식 그래프도 위키링크를 간선으로 보는 그래프다.
- 방문 표시 집합은 보통 해시 테이블로 구현한다.

가중치가 다른 간선까지 다루려면 다익스트라가 필요한데, 이는 최단 경로 알고리즘 쪽 주제다.
