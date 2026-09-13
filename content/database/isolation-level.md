---
title: 격리 수준
category: database
tags: [동시성, MVCC, 일관성]
summary: 동시 트랜잭션이 서로를 얼마나 볼 수 있는지 정하는 네 단계. 일관성과 동시성의 절충이다.
created_at: 2025-02-07
aliases: [isolation level, 격리수준]
---

# 격리 수준

| 수준 | Dirty Read | Non-repeatable Read | Phantom Read |
| --- | --- | --- | --- |
| READ UNCOMMITTED | 발생 | 발생 | 발생 |
| READ COMMITTED | 없음 | 발생 | 발생 |
| REPEATABLE READ | 없음 | 없음 | 발생* |
| SERIALIZABLE | 없음 | 없음 | 없음 |

*MySQL InnoDB 는 갭 락으로 REPEATABLE READ 에서도 팬텀을 대부분 막는다.

## MVCC

락으로 읽기를 막는 대신 **버전을 여러 개 유지해** 읽는 쪽이 커밋된 스냅샷을 보게 한다. 읽기가 쓰기를 막지 않아 동시성이 크게 올라간다. PostgreSQL 과 InnoDB 가 모두 이 방식이다.

## 연결

- 수준을 올릴수록 락 범위가 넓어져 [[데드락]] 가능성이 커진다.
- 근본적으로는 [[스레드]]의 경쟁 조건과 같은 문제를 데이터베이스 언어로 옮긴 것이다.
- ACID 의 I 에 해당하며 나머지는 [[트랜잭션]]에서 다룬다.
