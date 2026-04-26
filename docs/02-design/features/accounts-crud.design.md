# Design — accounts-crud

> Plan: `docs/01-plan/features/accounts-crud.plan.md`

**작성일**: 2026-04-26

---

## 1. Architecture — Option C (Pragmatic Balance)

| 옵션 | 특징 | 채택 |
|---|---|---|
| A. REST API + Client fetch | `app/api/accounts/route.ts` 별도 + 클라이언트 fetch | ❌ Boilerplate 많음 |
| B. Server Components + DB 직접 호출 | 페이지에서 Supabase 직접 호출, 변경은 Server Action | ✅ — Next 16의 표준 |
| C. tRPC / GraphQL | 타입 안전, 풍부 | ❌ 1인 앱에 과도 |

→ **B 채택**. 이유: 단순성·Next.js 16 표준 패턴·서버에서 RLS 자동 적용.

---

## 2. 파일 구조

```
lib/accounts/
└── schema.ts                       # zod + types + Korean labels

app/accounts/
├── page.tsx                        # 목록 (Server Component)
├── account-row.tsx                 # 행 + 삭제 버튼 (Client Component)
├── account-form.tsx                # 생성·편집 공용 폼 (Client Component)
├── actions.ts                      # Server Actions (create/update/delete)
├── new/
│   └── page.tsx                    # 생성 페이지 (form 호스팅)
└── [id]/
    └── edit/
        └── page.tsx                # 편집 페이지 (form prefill)
```

---

## 3. 데이터 흐름

### 3.1 목록 조회 (`/accounts`)
```
[Server Component] page.tsx
    ↓ createSupabaseServerClient()
    ↓ supabase.from('accounts').select('*').order('created_at', desc)
    ↓ RLS: auth.uid() = user_id 자동 적용
[클라이언트로 SSR된 HTML 반환]
```

### 3.2 생성 (`POST` via Server Action)
```
[Client Form] account-form.tsx
    ↓ startTransition + createAccount(input)
[Server Action] actions.ts:createAccount
    ↓ zod 검증
    ↓ getUser() — 인증 확인
    ↓ insert with user_id = user.id
    ↓ Postgres allowlist trigger 재검증
    ↓ revalidatePath('/accounts')
    ↓ redirect('/accounts')
```

### 3.3 편집·삭제 동일 패턴

---

## 4. 타입·검증

### 4.1 enum 정의

```ts
export const ACCOUNT_TYPES = [
  'general', 'isa', 'pension', 'irp', 'retirement', 'foreign'
] as const;

export const ACCOUNT_TYPE_LABELS = {
  general:    '일반',
  isa:        'ISA',
  pension:    '연금저축',
  irp:        'IRP',
  retirement: '퇴직연금',
  foreign:    '해외주식',
} as const;

export const CURRENCIES = ['KRW', 'USD', 'JPY', 'EUR', 'CNY', 'HKD'] as const;
```

### 4.2 zod 스키마

```ts
export const accountFormSchema = z.object({
  broker:       z.string().trim().min(1).max(100),
  account_type: z.enum(ACCOUNT_TYPES),
  currency:     z.enum(CURRENCIES),
  name:         z.string().trim().max(100).optional(),
});
```

---

## 5. UI 와이어프레임

### `/accounts` (목록)

```
┌──────────────────────────────────────────────┐
│  japa | min5859@gmail.com           [Logout] │
├──────────────────────────────────────────────┤
│  계좌 관리                          [+ 새 계좌] │
│  ──────                                      │
│  ┌────────────────────────────────────────┐  │
│  │ 키움증권   ISA      KRW   메인 ISA     │  │
│  │                          [편집][삭제]   │  │
│  ├────────────────────────────────────────┤  │
│  │ 미래에셋   해외주식  USD  미국주식     │  │
│  │                          [편집][삭제]   │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### `/accounts/new` 또는 `/accounts/[id]/edit`

```
┌──────────────────────────────────────┐
│  새 계좌 추가 (또는 편집)             │
│  ────────                            │
│  증권사 *                            │
│  [ 키움증권              ]           │
│                                      │
│  계좌 유형 *                          │
│  [ 일반 ▼ ]                          │
│                                      │
│  통화 *                              │
│  [ KRW ▼ ]                           │
│                                      │
│  별칭 (선택)                          │
│  [ 메인 계좌            ]            │
│                                      │
│  [취소]              [저장]          │
└──────────────────────────────────────┘
```

---

## 6. 보안·검증 layer

| Layer | 위치 | 역할 |
|---|---|---|
| 1. Form-level (UX) | `account-form.tsx` | required, maxLength HTML5 |
| 2. zod | `actions.ts` | 타입·길이·enum 검증 |
| 3. Auth | Server Action 내 getUser() | 비인증 reject |
| 4. RLS | Postgres | auth.uid() = user_id |
| 5. Trigger | Postgres `check_owner_allowlist` | email + user_id 일치 검증 |

---

## 7. Decision Record

| 결정 | 사유 |
|---|---|
| Server Actions (REST API X) | Next 16 표준, boilerplate 최소 |
| `account-form.tsx` 단일 컴포넌트로 생성·편집 모두 | DRY, props로 분기 |
| 삭제는 confirm() (모달 X) | 1인 앱 단순성, Phase 2에서 모달 검토 |
| user_id는 클라이언트가 보내지 않음 | Server Action에서 `auth.uid()`로 주입, Postgres 트리거가 이중 검증 |
| Korean label은 클라이언트 렌더 시점에 매핑 (DB는 영문) | i18n 확장성 + 마이그레이션 부담 X |
