# Plan — japa-s 비교 후 도출한 상위 3개 도입 항목

작성일: 2026-05-03
비교 대상: `/Users/wooki/project/git/wk/japa-s` (Supabase SSR + Zod 스키마 통합 기반 재구축본)

## 도입 후보 (우선순위: 상)

| # | 기능 | 핵심 효과 | 의존 |
|---|------|-----------|------|
| 1 | Supabase Auth + 이메일 Allowlist | 매직 링크 인증, 표준 세션 관리 | Supabase 프로젝트 + `@supabase/ssr` |
| 2 | AI 키 AES-256-GCM 암호화 | 멀티 LLM 사용자 키 안전 저장 | Phase: 멀티 LLM 도입과 함께 |
| 3 | Zod 스키마 통합 (`lib/<entity>/schema.ts`) | 서버·클라이언트 검증 일관성, enum SSOT | 없음 (즉시 가능) |

**권장 진입 순서**: 3 → 1 → 2
- 3은 의존성·리스크 없음, 30분~1시간 단위로 점진 도입 가능
- 1은 인증 전환이라 별도 세션 권장, 배포 영향 큼
- 2는 멀티 LLM 도입이 선행되어야 가치 발현 (현재 Gemini 단일이라 보류 가능)

---

## 1. Zod 스키마 통합 (먼저 권장)

### 현재 상태
- Zod 검증이 **4개 server action 파일에 분산**되어 있음
  - `app/actions/accounts.ts:16` — AccountSchema, type/currency enum
  - `app/actions/holdings.ts:18` — HoldingSchema, assetClass/currency enum
  - `app/actions/dividends.ts:9` — DividendSchema, currency enum
  - `app/actions/groups.ts:8` — GroupSchema
- enum **중복 정의**: `currency` (`["KRW","USD","EUR","JPY","CNY","GBP","HKD","SGD"]`)가 4번, `accountType`이 Prisma + accounts.ts 두 곳에 존재
- `lib/labels.ts`에는 같은 enum의 select option 형태(`ACCOUNT_TYPES`, `CURRENCIES`)가 또 따로 있음
- 폼(`components/forms/*`)은 Zod 스키마를 import할 수 없으므로 클라이언트 검증은 HTML `required` 속성에 의존 → 서버 왕복 후에야 에러 표시

### 목표 구조
```
lib/
├── accounts/schema.ts       # ACCOUNT_TYPES + ACCOUNT_TYPE_LABELS + accountFormSchema + AccountFormInput type
├── holdings/schema.ts
├── dividends/schema.ts
└── groups/schema.ts
```

각 파일은 **상수·라벨·Zod 스키마·infer 타입**을 한 곳에 모음. Prisma enum은 `@prisma/client`에서 import해 `z.nativeEnum()`으로 감싸서 SSOT 유지.

### 작업 단계 (Account부터 시범 도입)

- [ ] **(a)** `lib/accounts/schema.ts` 신규 작성
  - Prisma `AccountType`, `Currency` enum을 `z.nativeEnum()`으로 래핑
  - `AccountSchema` (현재 `app/actions/accounts.ts:16`) 그대로 옮김
  - `ACCOUNT_TYPE_LABELS`, `CURRENCY_LABELS` (현재 `lib/labels.ts`) 함께 이동 — labels.ts는 단계적으로 비워가기
- [ ] **(b)** `app/actions/accounts.ts`에서 schema import로 변경, 중복 제거
- [ ] **(c)** `components/forms/account-form.tsx`에서 같은 schema import
  - 시범적으로 클라이언트 측 즉시 검증은 보류해도 됨 (현재 useActionState 패턴 유지)
  - 최소한 ACCOUNT_TYPE_LABELS / CURRENCY_LABELS 출처를 schema.ts로 통일
- [ ] **(d)** Prisma enum 변경 시 자동 반영되는지 확인 (예: AccountType에 새 값 추가 → 폼 select에 자동 노출)
- [ ] **(e)** Holdings → Dividends → Groups 순서로 같은 패턴 반복 (각 30분 예상)

### 선택: react-hook-form + zodResolver 도입
- 가치: 폼 제출 전 즉시 에러 표시
- 비용: `@hookform/resolvers` 추가, useActionState 패턴 일부 변경
- 추천: 4개 entity 모두 schema 파일 분리가 끝난 후 별도 작업으로

### 검증
- `npm run typecheck && npm run lint` 무에러
- 각 entity 폼 정상 저장·수정 동작 (브라우저 확인)
- Prisma enum에 시범 값 추가 → 폼 select에 자동 노출 확인 → 다시 제거

### 위험
- 거의 없음. 점진적 도입 가능, 한 entity 단위로 PR 가능.

---

## 2. Supabase Auth + 이메일 Allowlist

### 현재 상태
- **`middleware.ts`**: `japa_session` 쿠키 + `verifySessionToken()` HMAC SHA-256 검증
- **`lib/auth.ts`** (75 lines): AUTH_SECRET 기반 자체 토큰, ADMIN_PASSWORD 비교 (`verifyAdminPassword`)
- **`app/login/page.tsx`** + `app/actions/login.ts`: 단일 비밀번호 입력 폼
- 환경변수: `AUTH_SECRET`, `ADMIN_PASSWORD`
- **장점**: 외부 의존 0, 가볍다
- **약점**: 비밀번호 분실 시 복구 불가, 매직 링크 같은 표준 UX 없음, OAuth 확장 불가, 세션 무효화/디바이스별 관리 불가

### 목표 (japa-s 패턴 차용)
- Supabase Auth 매직 링크로 로그인 (이메일 입력 → 인증 메일 → 클릭 → 세션)
- 이메일 Allowlist (`OWNER_EMAIL` 환경변수)로 1인 전용 유지
- `lib/supabase/middleware.ts:65` 패턴: `supabase.auth.getUser()` + `isAllowedEmail(user.email)` 양방향 체크

### 작업 단계

- [ ] **(a)** Supabase 프로젝트에서 Auth 설정
  - Email provider 활성화 (현재 사용 중인 supabase 프로젝트에 이미 켜져 있을 가능성 높음)
  - Site URL: `http://localhost:3000` + Vercel production URL 추가
  - 매직 링크 메일 템플릿 한글화 (선택)
- [ ] **(b)** 의존성 추가
  ```bash
  npm i @supabase/ssr @supabase/supabase-js
  ```
- [ ] **(c)** `lib/supabase/` 모듈 신규
  - `lib/supabase/server.ts` — `createServerClient()` 래퍼 (cookies API 연동)
  - `lib/supabase/client.ts` — 브라우저용 `createBrowserClient()` 래퍼
  - `lib/supabase/middleware.ts` — japa-s `lib/supabase/middleware.ts:21` 그대로 차용
- [ ] **(d)** `lib/auth/allowlist.ts` 신규
  - japa-s `lib/auth/allowlist.ts` 그대로 차용 (`getOwnerEmail`, `isAllowedEmail`)
  - 환경변수: `OWNER_EMAIL`
- [ ] **(e)** 라우트 신규
  - `app/auth/callback/route.ts` — 매직 링크 클릭 시 code → session 교환 (Supabase 표준)
  - `app/login/page.tsx` 갱신 — 이메일 입력 + 매직 링크 발송 폼
  - `app/actions/login.ts` 폐기 또는 매직 링크 발송 액션으로 교체
- [ ] **(f)** `middleware.ts` 교체
  - 현재 `verifySessionToken` 호출부를 `updateSession()` 호출로 대체
  - `PUBLIC_PATHS`에 `/auth/callback` 추가
  - matcher의 `api/cron` 예외는 유지 (Vercel Cron이 cookie 없이 호출)
- [ ] **(g)** `lib/auth.ts`, `app/actions/login.ts` (구) 정리
  - `LogoutButton`도 Supabase `signOut()` 호출로 교체
- [ ] **(h)** 환경변수 정리
  - 추가: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OWNER_EMAIL` (있다면 재사용)
  - 제거: `AUTH_SECRET`, `ADMIN_PASSWORD`
  - `.env.example` 업데이트
- [ ] **(i)** Vercel 환경변수 동기화

### 검증
- 로컬: 이메일 입력 → 받은 메일 클릭 → 인증된 상태로 / 진입
- Allowlist 외 이메일로 시도 → /login 으로 리다이렉트 + error param
- /api/cron/daily는 cookie 없이도 정상 동작 (현재와 동일)
- 세션 만료 후 자동 갱신 (Supabase SSR이 처리)

### 위험
- **배포 영향 큼**: 인증 전환 중 자기 자신이 락아웃될 수 있음 → 로컬에서 충분히 검증 후 Vercel preview에서 한 번 더 확인
- **api/cron 라우트 인증 별도 검토**: 현재 matcher에서 제외되어 있어 노출. Vercel Cron Header (`Authorization: Bearer $CRON_SECRET`) 검증 추가 권장 (별건이지만 같이 정리하면 좋음)
- **Cookie SameSite 정책**: japa-s는 `lax` 사용 (매직 링크 cross-site 호환). 그대로 따라가기

### 작업량
중~대. 1세션 (2~4시간) 예상. **별도 세션 권장**.

---

## 3. AI 키 AES-256-GCM 암호화

### 현재 상태
- `lib/ai.ts:90` — `process.env.GEMINI_API_KEY` 직접 사용
- 단일 LLM (Google Gemini), 단일 키, 환경변수만으로 충분히 작동
- DB에 키 저장 없음

### 전제: 멀티 LLM 도입이 선행되어야 가치 있음
이 항목은 **"사용자가 UI에서 OpenAI/Anthropic/Gemini 등 다양한 LLM 키를 등록·교체"** 시나리오를 위한 것. 현재 1인 전용 + Gemini 단일이라면 환경변수가 더 단순함. 따라서 다음 중 하나를 먼저 결정:

- **Track A**: 멀티 LLM 도입 의사 있음 → 본 작업 진행 가치 큼
- **Track B**: 당분간 Gemini 단일로 유지 → 본 작업 보류, 환경변수 그대로

### 목표 (Track A 진행 시)
- DB에 사용자별 (현재는 단일 사용자) `ai_credentials` 테이블 — provider별 암호화된 키 저장
- 평문은 절대 DB에 두지 않음. AES-256-GCM (NIST 권장)
- 키 회전 가능하도록 `keyVersion` 컬럼

### 작업 단계 (Track A)

- [ ] **(a)** Prisma 모델 추가
  ```prisma
  enum AiProvider { GEMINI OPENAI ANTHROPIC DEEPSEEK }

  model AiCredential {
    id          String     @id @default(cuid())
    provider    AiProvider @unique  // 1인 전용이라 unique. 다중 사용자면 (userId, provider) composite
    ciphertext  Bytes
    iv          Bytes
    authTag     Bytes
    keyVersion  Int        @default(1)
    label       String?
    createdAt   DateTime   @default(now())
    updatedAt   DateTime   @updatedAt
  }
  ```
- [ ] **(b)** `lib/ai/crypto.ts` 신규
  - japa-s `lib/ai/crypto.ts` 그대로 차용 (`encryptApiKey`, `decryptApiKey`, `EncryptedPayload`)
  - 환경변수: `AI_KEY_ENCRYPTION_SECRET` (생성: `openssl rand -hex 32`)
- [ ] **(c)** server action 추가
  - `app/actions/ai-credentials.ts` — set/delete (read는 평문 노출하지 않음, 보유 여부만 반환)
  - 마스킹된 미리보기(첫 4자리 + ****)만 UI에 노출
- [ ] **(d)** UI 추가
  - `/settings/ai` 페이지 — provider별 키 입력 폼, 등록 상태 표시
- [ ] **(e)** `lib/ai.ts` 리팩터
  - `getApiKey(provider)` 헬퍼: DB에 등록된 암호화 키 → decrypt → 캐시 (메모리만)
  - 환경변수 fallback도 유지 (DB 미등록 시 `GEMINI_API_KEY` 사용)
  - 멀티 provider 라우팅: `analyzePortfolio({ provider: "openai" })` 등
- [ ] **(f)** 환경변수
  - 추가: `AI_KEY_ENCRYPTION_SECRET`
  - **분실 시 저장된 모든 키 복구 불가** → 1Password 등 별도 백업 필수

### 검증
- 키 등록 → DB 확인 (ciphertext가 평문이 아님)
- 키 조회 → 마스킹된 형태로만 노출 (네트워크 응답 캡처 확인)
- 재기동 후에도 정상 복호화
- 환경변수 변경 시 의도적으로 복호화 실패 → 명확한 에러

### 위험
- **AI_KEY_ENCRYPTION_SECRET 분실 = 모든 저장 키 손실**. 키 회전 절차 사전 문서화 필요
- DB 백업 시 ciphertext만 있어도 secret이 없으면 복호화 불가 (의도된 보안)
- Vercel 환경변수에 secret 노출 시 보안 책임 동일하게 큼 → 환경변수만 쓸 때와 본질적으로 다른 보안 모델은 아님 (위협 모델: DB 덤프 vs DB+ENV 동시 유출)

### 작업량
중~대. 멀티 LLM 라우팅 자체가 큰 작업. 1세션~2세션 예상.

---

## 환경변수 변경 요약

### 추가 (도입 시)
| 변수 | 용도 | 항목 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL (이미 있을 가능성) | #2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 (이미 있을 가능성) | #2 |
| `OWNER_EMAIL` | 1인 전용 allowlist | #2 |
| `AI_KEY_ENCRYPTION_SECRET` | 64자 hex (`openssl rand -hex 32`) | #3 |

### 제거
| 변수 | 비고 |
|------|------|
| `AUTH_SECRET` | #2 도입 후 |
| `ADMIN_PASSWORD` | #2 도입 후 |

---

## 신규 의존성

| 패키지 | 용도 | 항목 |
|--------|------|------|
| `@supabase/ssr` | Next.js SSR용 Supabase 클라이언트 | #2 |
| `@supabase/supabase-js` | (보조) | #2 |
| `@hookform/resolvers` (선택) | Zod + react-hook-form 어댑터 | #1 선택 단계 |

---

## 진입 순서 추천

1. **#3 Zod 스키마 통합 — Account 시범 (이번 세션 가능)**
   - 의존 없음, 30분~1시간, 위험 거의 없음
   - 패턴 검증 후 Holdings/Dividends/Groups 확장
2. **#3 나머지 entity 확산 (다음 세션)**
3. **#2 Supabase Auth (별도 세션)**
   - 인증 락아웃 위험으로 충분한 검증 시간 필요
   - Vercel preview 배포로 한 번 더 검증
4. **(결정 후) #3 react-hook-form 도입 또는 #2 멀티 LLM + AI 키 암호화**

---

## Open Questions (착수 전 확인)

- [ ] 멀티 LLM(OpenAI/Claude 등) 도입 의사가 있는가? → #3 진행 여부 결정
- [ ] Supabase Auth로 전환 시 기존 ADMIN_PASSWORD 방식과 병행 기간을 둘 것인가, 즉시 컷오버 할 것인가?
- [ ] `OWNER_EMAIL`로 사용할 이메일 (Supabase Auth 매직 링크 수신 주소)
- [ ] react-hook-form 도입 여부 (작업량 작지만 패턴 변경)
