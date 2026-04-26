# Phase 1 MVP — 설계 문서 (japa)

> 개인 자산관리 프로그램의 Phase 1 (MVP) 구현 청사진.
> 작성일: 2026-04-26 / 대상 사용자: 1인 / 환경: 로컬 개발

---

## 1. 목표 (Goal)

**1인용 자산관리 웹앱의 최소 기능을 로컬에서 실행 가능한 상태**까지 완성한다.

### Done의 정의 (Definition of Done)
- 본인이 로그인 후, 계좌·종목·거래를 수동 입력하고
- 대시보드에서 총자산·계좌별 잔고·자산군 비중을 확인할 수 있으며
- Yahoo Finance에서 시세를 가져와 평가금액이 자동 갱신된다

### Out of Scope (Phase 2 이후)
- 종합금융소득세·해외주식 양도소득세 엔진 (Phase 2)
- AI 재무 코치 (Phase 3)
- CSV 임포트, 증권사 API 자동화 (Phase 2~)
- Vercel 배포 (Phase 2~)
- 모바일 최적화 (Phase 4)

---

## 2. 화면 구성 (Routes)

```
/                       → 랜딩, 미인증 시 /login으로 redirect
/login                  → 매직 링크 로그인 (이메일 입력)
/auth/callback          → Supabase Auth 콜백 처리

[인증 후 보호 영역]
/dashboard              → 메인 대시보드 (총자산, 자산군, 계좌별 카드)
/accounts               → 계좌 목록·생성·편집
/accounts/[id]          → 계좌 상세 (보유종목, 거래내역)
/accounts/[id]/holdings/new      → 종목 추가
/accounts/[id]/transactions/new  → 거래 입력
/holdings/[id]          → 종목 상세 (거래내역, 평가손익)
/settings               → AI 프로바이더 키 등록, 환율 갱신, 시세 일괄 갱신
```

---

## 3. 데이터 모델 (Supabase Schema)

> 1인 전용 — `user_id` FK 생략. RLS는 "authenticated 모두 허용"으로 단순화.
> 금액은 `numeric(20, 4)` 사용 (Decimal 정확도 확보).

### 3.1 `accounts` (계좌)
```sql
create table accounts (
  id          uuid primary key default gen_random_uuid(),
  broker      text not null,              -- 예: '키움증권'
  account_type text not null,             -- 'general' | 'isa' | 'pension' | 'irp' | 'retirement' | 'foreign'
  currency    text not null default 'KRW', -- 'KRW' | 'USD' | ...
  name        text,                       -- 사용자 별칭 (선택)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

### 3.2 `holdings` (보유종목)
```sql
create table holdings (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references accounts(id) on delete cascade,
  ticker          text not null,           -- 'AAPL', '005930.KS'
  market          text not null,           -- 'US' | 'KR' | 'JP' | ...
  name            text,                    -- '삼성전자', 'Apple Inc'
  quantity        numeric(20, 4) not null default 0,
  avg_cost_price  numeric(20, 4) not null default 0,  -- 거래 통화 기준
  cost_currency   text not null default 'KRW',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index holdings_account_id_idx on holdings(account_id);
create index holdings_ticker_idx on holdings(ticker);
```

### 3.3 `transactions` (거래내역)
```sql
create table transactions (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts(id) on delete cascade,
  holding_id    uuid references holdings(id) on delete set null,
  type          text not null,             -- 'buy' | 'sell' | 'dividend' | 'interest' | 'fee' | 'deposit' | 'withdraw'
  quantity      numeric(20, 4),            -- 매수/매도 수량
  price         numeric(20, 4),            -- 단가 (거래 통화)
  amount        numeric(20, 4) not null,   -- 거래 총액 (수수료·세금 별도)
  fee           numeric(20, 4) default 0,
  tax_withheld  numeric(20, 4) default 0,  -- 원천징수 세금
  currency      text not null default 'KRW',
  trade_date    date not null,
  memo          text,
  created_at    timestamptz default now()
);
create index transactions_account_id_idx on transactions(account_id);
create index transactions_holding_id_idx on transactions(holding_id);
create index transactions_trade_date_idx on transactions(trade_date);
```

### 3.4 `price_cache` (시세 캐시)
```sql
create table price_cache (
  ticker        text not null,
  date          date not null,
  close_price   numeric(20, 4) not null,
  currency      text not null,
  source        text default 'yahoo',
  fetched_at    timestamptz default now(),
  primary key (ticker, date)
);
```

### 3.5 `fx_rates` (환율)
```sql
create table fx_rates (
  date        date not null,
  base        text not null default 'USD',  -- 'USD' 기준
  quote       text not null,                -- 'KRW', 'JPY' ...
  rate        numeric(20, 6) not null,
  fetched_at  timestamptz default now(),
  primary key (date, base, quote)
);
```

### 3.6 `ai_providers` (AI 프로바이더 설정)
```sql
create table ai_providers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,             -- 'openai' | 'anthropic' | 'google' | 'deepseek'
  display_name    text,                      -- 'OpenAI GPT-4' 등
  api_key_encrypted text not null,           -- pgsodium으로 암호화
  model           text,                      -- 'gpt-4o', 'claude-sonnet-4-6', 'gemini-2.5-pro'
  is_active       boolean default false,     -- 현재 사용 중 프로바이더 (1개만 true)
  created_at      timestamptz default now()
);
```

### 3.7 RLS (이중 안전망)

> 💡 **Supabase advisor의 "Enable automatic RLS" 이벤트 트리거 활성화 권장**
> → `public` 스키마에 새 테이블 생성 시 RLS가 자동으로 켜짐 (fail-closed 안전망)
> → 이 경우 `alter table ... enable row level security` 줄은 생략 가능하지만, 명시적으로 적어두는 것이 마이그레이션 가독성에 좋음

```sql
alter table accounts enable row level security;  -- 트리거가 켜도 명시 OK
create policy "auth_all" on accounts for all using (auth.role() = 'authenticated');
-- (holdings, transactions, price_cache, fx_rates, ai_providers 모두 동일 패턴 적용)
```

**중요**: RLS만 켜고 policy 없으면 모든 쿼리가 0행 반환됨 → 테이블 추가 시 **반드시 policy도 함께 작성**.

---

## 4. API 엔드포인트 (Next.js Route Handlers)

> 가능한 경우 Server Component에서 Supabase 직접 호출. 외부 API 연동·민감 작업만 Route Handler 사용.

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/auth/check-allowlist` | 매직 링크 발송 전 이메일 화이트리스트 체크 |
| POST | `/api/prices/refresh` | Yahoo Finance에서 시세 갱신 (전체 또는 ticker 지정) |
| POST | `/api/fx/refresh` | 환율 갱신 (한국은행 또는 Yahoo) |
| POST | `/api/ai/chat` | AI 호출 (현재 활성 프로바이더 사용) |
| POST | `/api/holdings/[id]/recalc` | 평균단가·수량 재계산 (거래 변경 시 트리거) |

CRUD (accounts, holdings, transactions)는 Supabase 클라이언트 직접 호출.

---

## 5. 폴더 구조

```
japa/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 랜딩
│   ├── login/page.tsx
│   ├── auth/callback/route.ts
│   ├── dashboard/page.tsx
│   ├── accounts/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── holdings/new/page.tsx
│   │       └── transactions/new/page.tsx
│   ├── holdings/[id]/page.tsx
│   ├── settings/page.tsx
│   └── api/
│       ├── prices/refresh/route.ts
│       ├── fx/refresh/route.ts
│       ├── ai/chat/route.ts
│       └── holdings/[id]/recalc/route.ts
├── components/
│   ├── ui/                         # shadcn/ui 또는 자체 UI
│   ├── dashboard/
│   ├── accounts/
│   └── charts/                     # Recharts 래퍼
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # 브라우저용
│   │   ├── server.ts               # 서버 컴포넌트용
│   │   └── types.ts                # `supabase gen types` 결과
│   ├── prices/
│   │   ├── yahoo.ts                # Yahoo Finance 호출 래퍼
│   │   └── cache.ts
│   ├── ai/
│   │   ├── providers/
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── gemini.ts
│   │   │   └── deepseek.ts
│   │   ├── factory.ts              # 활성 프로바이더 선택
│   │   └── crypto.ts               # API 키 암호화
│   ├── tax/                        # Phase 2에서 본격 구현
│   ├── auth/
│   │   └── allowlist.ts
│   └── utils/
│       ├── decimal.ts              # Decimal 헬퍼
│       └── format.ts               # 통화·날짜 포맷
├── prompts/                        # AI 프롬프트 분리 보관
│   └── monthly-report.md           # (Phase 3)
├── supabase/
│   ├── migrations/
│   │   └── 0001_initial.sql        # 위 스키마
│   └── config.toml                 # (선택)
├── docs/
│   └── 01-plan/phase-1-mvp-plan.md
├── .env.local.example
├── .env.local                      # (gitignored)
├── middleware.ts                   # Allowlist 가드
├── next.config.js
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## 6. 환경변수 (`.env.local.example`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...           # 서버 전용, 절대 클라이언트 노출 X

# Auth Allowlist
OWNER_EMAIL=min5859@gmail.com

# AI 키 암호화용 (32바이트 base64)
AI_KEY_ENCRYPTION_SECRET=                 # `openssl rand -base64 32`로 생성

# Yahoo Finance (현재 인증 불필요)
# YAHOO_API_KEY=
```

---

## 7. AI 프로바이더 추상화 레이어 설계

### 인터페이스

```ts
// lib/ai/types.ts
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface AIProvider {
  name: 'openai' | 'anthropic' | 'google' | 'deepseek';
  chat(messages: ChatMessage[], opts?: { temperature?: number }): Promise<string>;
}
```

### Factory 패턴

```ts
// lib/ai/factory.ts (의사코드)
export async function getActiveProvider(): Promise<AIProvider> {
  const { data } = await supabase
    .from('ai_providers')
    .select('*')
    .eq('is_active', true)
    .single();
  const apiKey = decrypt(data.api_key_encrypted);
  switch (data.name) {
    case 'openai':    return new OpenAIProvider(apiKey, data.model);
    case 'anthropic': return new AnthropicProvider(apiKey, data.model);
    case 'google':    return new GeminiProvider(apiKey, data.model);
    case 'deepseek':  return new DeepSeekProvider(apiKey, data.model);
  }
}
```

> Vercel AI SDK (`ai` 패키지)를 도입하면 OpenAI/Anthropic/Google이 통일된 인터페이스로 묶임 → 검토 후 선택.

---

## 8. 시세 연동 (Yahoo Finance)

### 두 가지 접근법

**옵션 A**: Yahoo v8 엔드포인트 직접 호출 (Next.js 단독)
```
https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1mo
```
- 장점: Python 사이드카 불필요
- 단점: 비공식 엔드포인트, 변경 위험

**옵션 B**: Python `yfinance` 사이드카 (FastAPI)
- 장점: 라이브러리가 안정적, 스키마 일관성
- 단점: 별도 서버 운영, 배포 시 복잡

> **MVP 추천: 옵션 A** — 단순함 우선. 안정성 문제 발생 시 Phase 2에서 옵션 B로 전환.

### 캐싱 전략
- 매일 1회 `/api/prices/refresh` 자동 호출 (cron 또는 사용자 수동)
- `price_cache` 테이블에 ticker+date 단위로 저장
- 평가금액 계산 시 가장 최근 `price_cache` 행 조회

---

## 9. 인증 플로우 (Supabase Auth + Allowlist)

```
[사용자] /login 진입
  → 이메일 입력
  → POST /api/auth/check-allowlist로 OWNER_EMAIL 일치 확인
  → 통과 시 supabase.auth.signInWithOtp({ email })
  → Supabase가 매직 링크 메일 발송
  → 메일 클릭 → /auth/callback에서 세션 생성
  → /dashboard로 리다이렉트

[middleware.ts]
  - 모든 보호 라우트에서 세션 확인
  - 세션 없으면 /login으로 redirect
  - 세션 있어도 user.email !== OWNER_EMAIL이면 403
```

---

## 10. 구현 순서 (Phase 1 체크리스트)

### Step 1. 프로젝트 셋업
- [ ] `create-next-app@latest japa --ts --tailwind --app --src-dir=false`
- [ ] Supabase 신규 프로젝트(Seoul) 생성
- [ ] `npm install @supabase/supabase-js @supabase/ssr`
- [ ] `npm install recharts decimal.js`
- [ ] `.env.local` 작성

### Step 2. DB 스키마
- [ ] `supabase/migrations/0001_initial.sql` 작성·실행 (Supabase SQL Editor)
- [ ] `supabase gen types typescript` 실행

### Step 3. 인증
- [ ] Supabase Auth 매직 링크 활성화
- [ ] `/login`, `/auth/callback`, `middleware.ts` 구현
- [ ] Allowlist 가드 동작 확인

### Step 4. 계좌 CRUD
- [ ] `/accounts` 목록·생성·편집·삭제
- [ ] `/accounts/[id]` 상세

### Step 5. 종목·거래
- [ ] 종목 추가/편집
- [ ] 거래 입력 (buy/sell/dividend/interest)
- [ ] 거래 입력 시 `holdings`의 quantity·avg_cost_price 자동 재계산

### Step 6. 시세 연동
- [ ] Yahoo Finance 호출 함수 (`lib/prices/yahoo.ts`)
- [ ] `/api/prices/refresh` 라우트
- [ ] 사용자 수동 갱신 버튼

### Step 7. 대시보드
- [ ] 총자산 카드
- [ ] 자산군별 비중 (Recharts Pie)
- [ ] 계좌별 카드 (잔고·평가금액·수익률)
- [ ] 통화 환산 (USD↔KRW)

### Step 8. AI 프로바이더 등록 화면 (코어만)
- [ ] `/settings`에서 키 등록·암호화 저장
- [ ] 프로바이더 전환 (실제 호출은 Phase 3에서)

---

## 11. 주의·리스크

| 리스크 | 대응 |
|---|---|
| Yahoo Finance 비공식 → 변경/차단 위험 | 캐싱 적극, 실패 시 수동 입력 fallback, Phase 2에서 yfinance 사이드카 검토 |
| 한국 주식 커버리지 불완전 | `.KS`/`.KQ` 접미사 시도 → 실패 시 수동 입력 |
| Decimal 정확도 | `decimal.js` 사용, DB는 `numeric(20,4)` |
| RLS 잘못 구성 시 데이터 노출 | 매 테이블 RLS enable 확인, 단위 테스트 (Phase 2) |
| AI 키 평문 노출 | DB 저장 전 AES-256 암호화, 복호화는 서버에서만 |
| 환율 0인 종목 평가 오류 | fallback: 가장 최근 환율 사용, 없으면 1.0으로 처리 후 warning |

---

## 12. 미결정 사항 (Phase 1 진행 중 결정)

1. **UI 라이브러리**: shadcn/ui vs 자체 Tailwind 컴포넌트 — 셋업 시 결정
2. **Vercel AI SDK 도입 여부**: 추상화 레이어 직접 작성 vs SDK 사용 — Step 8에서 결정
3. **Decimal 직렬화**: API 응답 시 string vs number — 첫 API 작성 시 결정

---

## 13. 다음 단계

이 문서 승인 후:
1. ~~사용자: Supabase 신규 프로젝트(Seoul) 생성~~ ✅ 완료 (2026-04-26)
2. AI: Step 1~2 (프로젝트 셋업 + DB 스키마) 진행
3. Step별로 진행 상황 보고하며 점진적 구현
