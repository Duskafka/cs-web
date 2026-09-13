---
title: 이진 트리
category: ds-algo
tags: [트리, 자료구조, 탐색]
summary: 각 노드가 최대 두 개의 자식을 갖는 계층형 자료구조로, 탐색·정렬·인덱싱의 기반이 된다.
created_at: 2025-01-04
aliases: [binary tree, BST]
---

# 이진 트리

이진 트리는 각 노드가 최대 두 개의 자식(left, right)을 갖는 자료구조다. 여기에 "왼쪽 서브트리의 모든 값 < 부모 < 오른쪽 서브트리의 모든 값"이라는 제약을 더하면 **이진 탐색 트리(BST)** 가 된다.

## 왜 중요한가

정렬된 상태를 유지하면서 탐색·삽입·삭제를 모두 평균 `O(log n)` 에 처리할 수 있다. 이 성질 때문에 [[인덱스]]의 B-Tree, 우선순위 큐, 집합 자료형 구현에 반복적으로 등장한다.

```java
class Node {
    int key;
    Node left, right;
}

Node search(Node root, int key) {
    if (root == null || root.key == key) return root;
    return key < root.key ? search(root.left, key) : search(root.right, key);
}
```

## 균형이 깨지면

정렬된 데이터를 순서대로 삽입하면 트리가 한쪽으로 기울어 연결 리스트가 되고 탐색이 `O(n)` 으로 퇴화한다. AVL 트리나 Red-Black 트리는 삽입·삭제마다 회전으로 높이를 보정해 이를 막는다.

## 연결

- 트리를 일반화하면 [[그래프 탐색]]의 DFS/BFS 가 그대로 적용된다.
- 해시 기반 조회가 필요하면 [[해시 테이블]]이 대안이 된다.
- 디스크 기반 확장판인 B+Tree 는 [[인덱스]]의 기본 구조다.
