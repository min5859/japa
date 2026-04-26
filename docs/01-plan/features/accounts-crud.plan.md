# Plan — accounts-crud (계좌 CRUD)

> Phase 1 MVP의 Step 4. 계좌(`accounts`) 테이블에 대한 생성·조회·수정·삭제 UI 및 서버 로직.

**Feature**: `accounts-crud`
**상위 문서**: `docs/01-plan/phase-1-mvp-plan.md` §10 Step 4
**작성일**: 2026-04-26

---

## Executive Summary

| 관점 | 내용 |
|---|---|
| **Problem** | 자산을 입력하기 전, 먼저 "어느 증권사·어떤 종류의 계좌"인지 정의해야 함. 계좌 자체를 관리할 수단이 없음. |
| **Solution** | `/accounts` 라우트에 목록·생성·편집·삭제 UI. Next.js Server Actions로 단순하게 구현 (REST API 라우트 불필요). |
| **Function/UX 효과** | 사용자가 본인의 6종 계좌 유형(일반/ISA/연금/IRP/퇴직연금/해외)을 등록하고 별칭·통화를 지정할 수 있음. |
| **Core Value** | 이후 모든 자산 데이터(보유종목·거래)는 계좌에 종속됨. CRUD가 동작해야 다음 Step이 의미 있음. |

---

## Context Anchor

| 키 | 값 |
|---|---|
| **WHY** | 자산 데이터의 그릇(계좌) 관리. 모든 보유종목·거래의 부모 엔티티 |
| **WHO** | 1인 사용자, 인증 통과한 본인만 |
| **RISK** | 잘못된 user_id 주입(Postgres 트리거가 차단), 삭제 시 cascade로 보유종목까지 사라짐 |
| **SUCCESS** | 6종 계좌 유형으로 생성/편집/삭제 OK + RLS 동작 확인 |
| **SCOPE** | accounts 테이블만. holdings·transactions는 Step 5 |

---

## 1. Requirements

### Functional
- F1. 계좌 목록 보기 (`/accounts`) — 신규 → 오래된 순
- F2. 계좌 추가 (`/accounts/new`) — broker, account_type, currency, name(선택)
- F3. 계좌 편집 (`/accounts/[id]/edit`)
- F4. 계좌 삭제 — 확인 모달 후 cascade 경고
- F5. 대시보드에서 계좌 수 표시 + `/accounts` 링크

### Non-Functional
- NF1. **Server Actions 사용** (별도 API 라우트 불필요)
- NF2. zod로 입력 검증
- NF3. user_id는 서버에서 `auth.uid()`로 자동 주입 (Postgres 트리거가 이중 검증)
- NF4. Korean labels (`일반`/`ISA`/...) 표시 + 영문 enum 저장
- NF5. 삭제 시 cascade 경고문 명시 (보유종목·거래까지 같이 사라짐)

### Out of Scope
- 보유종목·거래 입력 (Step 5)
- 계좌별 평가금액 표시 (Step 7 대시보드)
- 계좌 색상·아이콘 등 부가 메타 (Phase 2 이후)

---

## 2. Success Criteria

| # | 기준 | 검증 |
|---|---|---|
| SC-1 | `/accounts` 진입 시 계좌 목록 표시 (RLS로 본인 것만) | 수동 |
| SC-2 | `/accounts/new`에서 모든 필드 입력 후 추가 → 목록 즉시 반영 | 수동 |
| SC-3 | 잘못된 account_type 전송 시 zod 검증 실패 | 수동 또는 단위 |
| SC-4 | `/accounts/[id]/edit`에서 수정 → 즉시 반영 + `updated_at` 갱신 | 수동 |
| SC-5 | 삭제 확인 후 행 사라짐 | 수동 |
| SC-6 | `npm run build` 통과, 타입 안전 | 자동 |

---

## 3. 의존성

- ✅ Step 3 인증 동작 (보호 라우트로 자동 가드)
- ✅ DB `accounts` 테이블 + RLS + allowlist trigger
- ✅ zod 설치됨
