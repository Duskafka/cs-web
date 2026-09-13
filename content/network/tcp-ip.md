---
title: TCP/IP
category: network
tags: [프로토콜, 계층, 신뢰성]
summary: 인터넷을 굴러가게 하는 4계층 프로토콜 스택. TCP는 신뢰성을, IP는 주소 지정과 라우팅을 맡는다.
created_at: 2025-01-24
aliases: [tcp, tcp ip, 전송 제어 프로토콜]
---

# TCP/IP

| 계층 | 역할 | 예시 |
| --- | --- | --- |
| 응용 | 데이터 의미 | [[HTTP]], [[DNS]] |
| 전송 | 종단 간 전달 | TCP, UDP |
| 인터넷 | 주소 지정과 경로 | IP, ICMP |
| 링크 | 물리 전송 | 이더넷, Wi-Fi |

## TCP 가 보장하는 것

- **연결 지향**: 3-way handshake(SYN, SYN-ACK, ACK)로 연결을 세운다.
- **신뢰성**: 순서 번호와 ACK, 재전송으로 손실과 순서 뒤바뀜을 복구한다.
- **흐름 제어**: 수신 윈도우로 받는 쪽이 감당할 속도를 알린다.
- **혼잡 제어**: slow start 와 congestion avoidance 로 네트워크를 보호한다.

UDP 는 이 모든 걸 포기하는 대신 지연이 낮다. 실시간 스트리밍과 게임이 UDP 를 쓰는 이유다.

## 연결

- handshake 왕복이 아까워 HTTP/3 는 UDP 기반 QUIC 로 갔다. 자세한 건 [[HTTPS와 TLS]].
- 연결을 맺기 전에 이름을 주소로 바꾸는 단계가 [[DNS]]다.
