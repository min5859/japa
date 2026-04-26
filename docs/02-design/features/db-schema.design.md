# Design — db-schema (DB 스키마 마이그레이션)

> Plan 문서: `docs/01-plan/features/db-schema.plan.md`
> 보안 리뷰: `/tmp/japa-security-review.md` (security-architect, 2026-04-26)

**Feature**: `db-schema`
**Phase**: PDCA Design (Team Mode)
**작성일**: 2026-04-26

---

## Context Anchor

| 키 | 값 |
|---|---|
| **WHY** | 자산 데이터·AI 키 등 민감 정보를 Supabase에 안전하게 저장 |
| **WHO** | 1인 사용자 (min5859@gmail.com) |
| **RISK** | Service role key 유출, 토큰 탈취, AI 키 평문 저장 |
| **SUCCESS** | 6개 테이블 + RLS 이중 방어 + AI 키 AES-256-GCM 암호화 round-trip OK |
| **SCOPE** | DDL + Node.js 암호화 helper |

---

## 1. Architecture Decision

3가지 옵션 중 **Option C (Pragmatic Balance)** 채택.

| 옵션 | 특징 | 선택 여부 |
|---|---|---|
| A. Minimal | RLS는 `auth.role()='authenticated'`만, user_id 없음, 단일 trigger 없음 | ❌ 1인이라도 보안 약함 |
| B. Clean | user_id + RLS + allowlist trigger + audit_log + pgsodium Vault | ❌ 1인 앱에 과도 |
| **C. Pragmatic** | user_id + RLS + allowlist trigger + Node.js AES-256-GCM (pgsodium 미사용) | ✅ **선택** |

### 선택 이유
- **충분한 보안**: user_id RLS + 이메일 트리거 = 토큰 탈취/service_role 유출 시에도 본인 데이터만 노출
- **단순성**: pgsodium/Vault 의존 없이 Node.js crypto만 사용 → 인프라 단순
- **회전 가능**: `key_version` 컬럼으로 향후 시크릿 교체 지원
- **확장성**: user_id FK가 있어 멀티유저 전환 시 마이그레이션 부담 0

---

## 2. 테이블 설계

### 2.1 `accounts` (계좌)
```
id            uuid PK (gen_random_uuid)
user_id       uuid FK → auth.users(id) ON DELETE CASCADE
broker        text NOT NULL                 -- '키움증권' 등
account_type  text NOT NULL                 -- general/isa/pension/irp/retirement/foreign
currency      text NOT NULL DEFAULT 'KRW'   -- 자유 (KRW/USD/JPY/EUR)
name          text                          -- 사용자 별칭 (선택)
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()

constraint:   account_type IN ('general','isa','pension','irp','retirement','foreign')
```

### 2.2 `holdings` (보유종목)
```
id              uuid PK
user_id         uuid FK → auth.users
account_id      uuid FK → accounts ON DELETE CASCADE
ticker          text NOT NULL                 -- 'AAPL', '005930.KS'
market          text NOT NULL                 -- 'KR' / 'US' / 'JP' / 'OTHER'
name            text                          -- '삼성전자', 'Apple Inc'
quantity        numeric(20, 4) NOT NULL DEFAULT 0
avg_cost_price  numeric(20, 4) NOT NULL DEFAULT 0
cost_currency   text NOT NULL DEFAULT 'KRW'
created_at      timestamptz
updated_at      timestamptz

unique(account_id, ticker)
index(user_id), index(account_id), index(ticker)
```

### 2.3 `transactions` (거래내역)
```
id            uuid PK
user_id       uuid FK → auth.users
account_id    uuid FK → accounts ON DELETE CASCADE
holding_id    uuid FK → holdings ON DELETE SET NULL  (nullable: dividend/interest)
type          text NOT NULL                 -- buy/sell/dividend/interest/fee
quantity      numeric(20, 4)                -- 매수/매도 시
price         numeric(20, 4)                -- 단가
amount        numeric(20, 4) NOT NULL       -- 거래 총액
fee           numeric(20, 4) DEFAULT 0
tax_withheld  numeric(20, 4) DEFAULT 0
currency      text NOT NULL DEFAULT 'KRW'
trade_date    date NOT NULL
memo          text
created_at    timestamptz
updated_at    timestamptz

constraint:   type IN ('buy','sell','dividend','interest','fee')
index(user_id), index(account_id), index(holding_id), index(trade_date)
```

### 2.4 `price_cache` (시세 캐시)
```
ticker      text NOT NULL
date        date NOT NULL
close_price numeric(20, 4) NOT NULL
currency    text NOT NULL
source      text DEFAULT 'yahoo'
fetched_at  timestamptz DEFAULT now()

PK(ticker, date)
```

### 2.5 `fx_rates` (환율)
```
date        date NOT NULL
base        text NOT NULL DEFAULT 'USD'
quote       text NOT NULL                 -- 'KRW', 'JPY' 등
rate        numeric(20, 6) NOT NULL
fetched_at  timestamptz DEFAULT now()

PK(date, base, quote)
```

### 2.6 `ai_providers` (AI 프로바이더 — 암호화 키 저장)
```
id                uuid PK
user_id           uuid FK → auth.users
name              text NOT NULL                 -- openai/anthropic/google/deepseek
display_name      text                          -- 'OpenAI GPT-4' 등
api_key_encrypted bytea NOT NULL                -- AES-256-GCM ciphertext
iv                bytea NOT NULL                -- 12 bytes (GCM 권장)
auth_tag          bytea NOT NULL                -- 16 bytes
key_version       int NOT NULL DEFAULT 1
model             text                          -- 'gpt-4o', 'claude-sonnet-4-6'
is_active         boolean DEFAULT false
created_at        timestamptz
updated_at        timestamptz

constraint:   name IN ('openai','anthropic','google','deepseek')
unique(user_id, name)
```

---

## 3. RLS 전략 (이중 방어)

### Layer 1: 표준 RLS — user_id 기반

```sql
-- 사용자 데이터 4개 테이블: 본인 row만
CREATE POLICY "owner_all" ON accounts      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner_all" ON holdings      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner_all" ON transactions  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner_all" ON ai_providers  FOR ALL USING (auth.uid() = user_id);

-- 공유 캐시 2개: 인증 사용자면 누구나 읽기
CREATE POLICY "auth_read" ON price_cache FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON fx_rates    FOR SELECT USING (auth.role() = 'authenticated');
-- INSERT/UPDATE는 service_role 또는 미들웨어에서만 (정책 추가 시 owner_all + 우회 검토)
```

### Layer 2: 이메일 Allowlist 트리거

```sql
CREATE OR REPLACE FUNCTION check_owner_allowlist()
RETURNS TRIGGER AS $$
DECLARE
  caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email IS NULL OR caller_email NOT IN ('min5859@gmail.com') THEN
    RAISE EXCEPTION 'Unauthorized: email % not in allowlist', caller_email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4개 사용자 테이블에 BEFORE INSERT/UPDATE 트리거
```

### 효과
- 토큰 탈취 → user_id RLS 우회 시도 → 트리거가 이메일 검증으로 차단
- service_role 우회 시 → 트리거가 SECURITY DEFINER이지만 `auth.uid()`가 NULL이면 차단
- 본인 외 누구도 INSERT/UPDATE 불가

---

## 4. AI 키 암호화 설계

### 4.1 알고리즘
- **AES-256-GCM** (Authenticated Encryption with Associated Data, AEAD)
- 128-bit IV (12바이트 권장 by NIST), 128-bit auth_tag

### 4.2 데이터 형식
- 컬럼 타입: `bytea` (Postgres 기본 binary 형식)
- Node.js ↔ Postgres 변환은 `Buffer` ↔ `bytea` 자동 매핑

### 4.3 환경 변수
```
AI_KEY_ENCRYPTION_SECRET=<64 hex chars>   # AES-256 키 (32바이트)
# 생성: openssl rand -hex 32
```

### 4.4 회전 전략
- `key_version=1`로 시작
- 회전 시 `AI_KEY_ENCRYPTION_SECRET_V1` 보존 + 새 `AI_KEY_ENCRYPTION_SECRET` 생성
- 마이그레이션 스크립트: V1로 복호화 → V2로 재암호화 → `key_version=2`로 업데이트

### 4.5 Node.js Helper API
```ts
// lib/ai/crypto.ts
export function encryptApiKey(plaintext: string): {
  ciphertext: Buffer; iv: Buffer; authTag: Buffer; keyVersion: number;
}

export function decryptApiKey(
  ciphertext: Buffer, iv: Buffer, authTag: Buffer, keyVersion: number
): string
```

---

## 5. 자동 타임스탬프 트리거

```sql
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- accounts/holdings/transactions/ai_providers에 BEFORE UPDATE 트리거
```

---

## 6. 인덱스 전략

| 테이블 | 인덱스 | 사유 |
|---|---|---|
| `holdings` | `(user_id)`, `(account_id)`, `(ticker)` | 사용자별·계좌별 조회 빈번, ticker 검색 |
| `transactions` | `(user_id)`, `(account_id)`, `(holding_id)`, `(trade_date)` | 거래 내역 시간순 조회, 종목별 필터 |
| `price_cache` | PK가 (ticker, date) — 별도 불필요 | composite PK가 인덱스 역할 |
| `fx_rates` | PK가 (date, base, quote) | 동일 |
| `ai_providers` | `(user_id, name)` UNIQUE | 사용자별 프로바이더 1개 보장 |

---

## 7. 구현 산출물

| 파일 | 설명 |
|---|---|
| `supabase/migrations/0001_initial.sql` | 6개 테이블 + RLS + 트리거 + 인덱스 |
| `lib/ai/crypto.ts` | AES-256-GCM 암호화/복호화 helper |
| `lib/supabase/types.ts` | `supabase gen types typescript` 결과 (Step 2 후반에 생성) |

---

## 8. 검증 절차 (Check Phase에서 수행)

| Step | 방법 |
|---|---|
| 1. SQL 문법 정합성 | Supabase SQL Editor에서 실행 → 에러 없으면 OK |
| 2. 테이블 존재 | `SELECT tablename FROM pg_tables WHERE schemaname='public'` → 6개 |
| 3. RLS enabled | `SELECT tablename FROM pg_tables WHERE rowsecurity=true` |
| 4. 정책 존재 | `SELECT policyname, tablename FROM pg_policies WHERE schemaname='public'` |
| 5. 트리거 존재 | `SELECT trigger_name, event_object_table FROM information_schema.triggers` |
| 6. 암호화 round-trip | `lib/ai/crypto.ts` 단위 테스트 (Node REPL 또는 단순 스크립트) |

---

## 9. Implementation Guide

### 9.1 Module Map

| 모듈 | 파일 | 의존성 |
|---|---|---|
| **M1: Migration SQL** | `supabase/migrations/0001_initial.sql` | 없음 |
| **M2: Encryption Helper** | `lib/ai/crypto.ts` | `crypto` (Node 내장) |
| **M3: 환경 변수 가이드** | `.env.local.example` 보완 | 없음 |

### 9.2 Recommended Session Plan
- **세션 1 (현재)**: M1 + M2 + M3 모두 한 번에 — 작은 범위라 분할 불필요
- **세션 2 (사용자)**: Supabase SQL Editor에서 `0001_initial.sql` 실행
- **세션 3 (검증)**: 검증 절차 수행

---

## 10. Decision Record

| 결정 | 사유 |
|---|---|
| `id`를 `uuid`로 (BIGSERIAL X) | 보안(enumeration 방지), 분산 친화 |
| `user_id` FK 추가 (Plan에서는 생략 권고) | security-architect 권고 — 토큰 탈취 시 이중 방어 |
| Postgres trigger 추가 (이메일 allowlist) | service_role 우회·미들웨어 우회 방어 |
| pgsodium/Vault 미사용 | 인프라 단순화, Node.js AES-256-GCM이 동등하게 안전 |
| `account_type`, `market` 등 enum 대신 `text + CHECK` | 마이그레이션 유연성 (enum 변경은 비싸다) |
| `numeric(20, 4)` (소수점 4자리) | 한국주식 1원 단위·해외주식 fractional share 모두 커버 |
