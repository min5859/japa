# Plan — db-schema (DB 스키마 마이그레이션)

> Phase 1 MVP의 Step 2. Supabase PostgreSQL에 6개 테이블 + RLS + 암호화 컬럼을 정의하는 초기 마이그레이션 작성·실행.

**Feature**: `db-schema`
**Phase**: PDCA Plan (Team Mode)
**상위 문서**: `docs/01-plan/phase-1-mvp-plan.md` §3, §11
**작성일**: 2026-04-26

---

## Executive Summary

| 관점 | 내용 |
|---|---|
| **Problem** | 자산 데이터를 저장할 DB 구조가 없음. 보안·정합성·확장성을 모두 고려한 초기 스키마 필요. |
| **Solution** | 6개 테이블(`accounts`/`holdings`/`transactions`/`price_cache`/`fx_rates`/`ai_providers`) + RLS 이중 방어(user_id 기반 RLS + 이메일 allowlist 트리거) + AES-256-GCM AI 키 암호화 컬럼. |
| **Function/UX 효과** | 사용자 데이터가 절대 노출되지 않는 안전망 확보. 향후 모든 기능이 이 스키마 위에서 동작. |
| **Core Value** | "한 번 잘 짠 스키마가 6개월의 디버깅을 막는다." 1인 전용이지만 멀티유저 확장 시에도 마이그레이션 부담 최소화. |

---

## Context Anchor

| 키 | 값 |
|---|---|
| **WHY** | 자산 데이터·AI 키 등 민감 정보를 Supabase에 안전하게 저장 |
| **WHO** | 1인 사용자 (`min5859@gmail.com`), 추후 가족 공유 가능성 열어둠 |
| **RISK** | Service role key 유출, 토큰 탈취, AI 키 평문 저장 |
| **SUCCESS** | (1) 6개 테이블 정상 생성 (2) RLS 정책 동작 확인 (3) AI 키 암호화 round-trip 검증 |
| **SCOPE** | DDL만 — 데이터 입력·UI는 다음 Step에서 |

---

## 1. Requirements

### Functional
- F1. `accounts`, `holdings`, `transactions` 3계층 관계 모델 (cascade delete)
- F2. 한국 6종 계좌 유형 지원 (general/ISA/pension/IRP/retirement/foreign)
- F3. 거래 유형 5종 (buy/sell/dividend/interest/fee)
- F4. 시세·환율 캐시 테이블 (Yahoo/한국은행 호출 결과 저장)
- F5. AI 프로바이더 4종(openai/anthropic/google/deepseek) 키 암호화 저장
- F6. 모든 사용자 데이터에 `created_at`, `updated_at` 자동 관리

### Non-Functional
- NF1. 금액은 `numeric(20, 4)` (Decimal 정확도)
- NF2. ID는 `uuid` (보안·분산 친화)
- NF3. RLS 이중 방어 (user_id 정책 + 이메일 allowlist 트리거)
- NF4. AI 키는 AES-256-GCM 암호화, key_version 컬럼으로 회전 가능

### Out of Scope (Phase 2+)
- 종합금융소득세·해외주식 양도소득세 계산 컬럼 → `tax_summary` 테이블 (Phase 2)
- 감사 로그(`audit_log`) → 필요 시 Phase 2 추가
- 자동화된 데이터 백업/복원 → Supabase 기본 기능 활용

---

## 2. Success Criteria

| # | 기준 | 검증 방법 |
|---|---|---|
| SC-1 | 6개 테이블 모두 생성 (accounts/holdings/transactions/price_cache/fx_rates/ai_providers) | Supabase Table Editor 또는 `\dt` |
| SC-2 | 모든 테이블 RLS enabled | `SELECT * FROM pg_tables WHERE rowsecurity=true` |
| SC-3 | RLS 정책 적용 확인 (user_id 기반) | `SELECT * FROM pg_policies` |
| SC-4 | 이메일 allowlist 트리거 동작 (가짜 이메일 INSERT 시 EXCEPTION) | 단위 검증 |
| SC-5 | `update_timestamp()` 트리거 동작 (UPDATE 시 updated_at 자동 갱신) | 수동 UPDATE 테스트 |
| SC-6 | AI 키 암호화/복호화 round-trip 일치 (`encrypt(x)` → `decrypt` → `x`) | 단위 테스트 |

---

## 3. Risks & Mitigations

| 리스크 | 영향 | 대응 |
|---|---|---|
| Service role key 유출 | RLS 우회 가능 | `.env.local` 외 절대 보관 금지, Vercel은 secrets 사용, 코드에서 service_role 사용 최소화 |
| 잘못된 RLS 정책으로 본인 데이터도 안 보임 | 앱 동작 불가 | 마이그레이션 후 즉시 수동 테스트 |
| AI 키 암호화 시크릿 분실 | 저장된 모든 AI 키 복호화 불가 | `AI_KEY_ENCRYPTION_SECRET` 별도 안전 저장 (1Password 등) |
| `auth.users` 외래키 cascade로 데이터 의도치 않게 삭제 | 자산 데이터 손실 | Phase 1은 본인만 사용, cascade로 OK. Phase 2+에서 재검토 |

---

## 4. Dependencies

- **Supabase Seoul 프로젝트**: 생성 완료 (2026-04-26)
- **Automatic RLS 트리거**: 활성화 권장 (사용자 작업)
- **`gen_random_uuid()` 함수**: PostgreSQL 13+ 기본 제공 (Supabase는 14+ 사용)
- **`pgcrypto` extension**: 필요 시 활성화 (현재 설계는 Node.js 암호화이므로 불필요)

---

## 5. Stakeholders

- **Owner**: 사용자 (min5859@gmail.com)
- **Reviewers**: cto-lead, security-architect (이미 리뷰 완료)
- **Implementer**: AI (Code) + 사용자 (Supabase SQL Editor 실행)
