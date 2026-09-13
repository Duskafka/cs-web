---
title: 트랜잭션
category: database
tags: [ACID, 무결성, 롤백]
summary: 더 이상 쪼갤 수 없는 작업 단위로, ACID 성질을 통해 데이터 무결성을 지킨다.
created_at: 2025-02-01
aliases: [transaction, acid]
---

# 트랜잭션

## ACID

- **원자성(Atomicity)**: 전부 반영되거나 전부 취소된다.
- **일관성(Consistency)**: 제약 조건을 깨지 않는 상태에서 상태로 옮겨간다.
- **격리성(Isolation)**: 동시 실행되는 다른 트랜잭션의 중간 상태가 보이지 않는다. 정도는 [[격리 수준]]으로 조절한다.
- **지속성(Durability)**: 커밋되면 장애가 나도 살아남는다. WAL(write-ahead log)로 구현한다.

```sql
BEGIN;
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;
COMMIT;
```

## 잠금과 교착

격리를 위해 락을 잡다 보면 두 트랜잭션이 서로를 기다리는 [[데드락]]이 생긴다. RDBMS 는 주기적으로 대기 그래프에서 사이클을 찾아 한쪽을 롤백시킨다.

## 연결

- 여러 서비스에 걸친 트랜잭션은 2PC 나 Saga 로 풀며, [[마이크로서비스 아키텍처]]의 대표 난제다.
- 분산 환경에서 강한 일관성을 고집하면 가용성을 내줘야 한다는 것이 [[CAP 정리]]다.
