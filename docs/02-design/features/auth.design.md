# Design — auth (인증 시스템)

> Plan: `docs/01-plan/features/auth.plan.md`
> 보안 리뷰: security-architect (2026-04-26, OWASP A01/A02/A03/A07/A10 커버)

**Feature**: `auth`
**작성일**: 2026-04-26

---

## Context Anchor

| 키 | 값 |
|---|---|
| **WHY** | 본인만 접속 가능하게 잠그기 + 비밀번호 부담 회피 |
| **WHO** | 1인 사용자 (min5859@gmail.com) |
| **RISK** | 토큰 탈취·OTP spam·email enumeration·open redirect·CSRF |
| **SUCCESS** | 본인만 로그인, 비-allowlist 메일 발송 X, 세션 보호 OK |

---

## 1. Architecture Decision — 4-Gate Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Journey + Security Gates                │
└─────────────────────────────────────────────────────────────────┘

[User] /login 진입 → 이메일 입력
    │
    ▼
GATE 1 — Client Form Validation (UX only, NOT security)
    │ React-Hook-Form + zod, "올바른 이메일 형식" 등
    │ 보안 책임 X. 우회 가능. 단지 UX 개선용.
    ▼
[Client] POST /api/auth/send-magic-link  { email }
    │
    ▼
GATE 2 — API Route (PRIMARY SECURITY GATE) 🔴
    │ - zod로 입력 검증
    │ - email === OWNER_EMAIL 검증 (서버 사이드)
    │ - 비-allowlist면: "If this email is registered..."
    │   (200 OK + generic message — enumeration 차단)
    │ - allowlist면: supabase.auth.signInWithOtp()
    │ - emailRedirectTo 하드코딩 (open redirect 차단)
    ▼
[Supabase] Magic Link 메일 발송 → 사용자 메일함
    │
    ▼
[User] 메일 클릭 → /auth/callback?code=xxx
    │
    ▼
GATE 3 — Callback Handler (BELT-AND-SUSPENDERS) 🔴
    │ - exchangeCodeForSession(code)
    │ - session.user.email === OWNER_EMAIL 재검증
    │ - 불일치 시 즉시 signOut() + /login redirect
    │ - 일치 시 httpOnly 쿠키 설정 → /dashboard redirect
    ▼
[User] /dashboard 진입
    │
    ▼
GATE 4 — Middleware (PER-REQUEST) 🔴
    │ - Supabase SSR getUser()로 세션 검증
    │ - user.email !== OWNER_EMAIL이면 /login redirect
    │ - public routes (/login, /auth/callback, /api/auth) 통과
    ▼
[User] 보호 라우트 정상 표시
```

### 핵심 원칙
- **단일 진입점은 GATE 2** (`/api/auth/send-magic-link`) — 클라이언트가 Supabase에 직접 호출 금지
- **GATE 3는 fail-safe** — GATE 2를 어떻게든 우회한 경우에도 세션 발급 차단
- **GATE 4는 지속 검증** — 세션이 살아있는 동안 매 요청 확인

---

## 2. 파일 구조

```
lib/
├── supabase/
│   ├── client.ts              # 브라우저 클라이언트 (Client Component용, Phase 1엔 거의 안 씀)
│   ├── server.ts              # 서버 컴포넌트/라우트용 (httpOnly 쿠키 자동 관리)
│   └── middleware.ts          # 미들웨어용 헬퍼 (auto-refresh + getUser)
├── auth/
│   └── allowlist.ts           # OWNER_EMAIL 상수 + isAllowedEmail() 함수

app/
├── login/
│   ├── page.tsx               # 로그인 페이지 (Server Component, 에러 메시지 표시)
│   └── login-form.tsx         # 폼 (Client Component, fetch /api/auth/send-magic-link)
├── auth/
│   └── callback/
│       └── route.ts           # GATE 3
├── api/auth/
│   ├── send-magic-link/
│   │   └── route.ts           # GATE 2 (PRIMARY)
│   └── logout/
│       └── route.ts           # signOut + redirect
└── dashboard/
    ├── page.tsx               # 보호 라우트 stub (Server Component)
    └── logout-button.tsx      # 클라이언트 로그아웃 버튼

middleware.ts                  # 루트 — GATE 4
```

---

## 3. 쿠키 정책

```ts
{
  httpOnly: true,                                    // XSS 방어
  secure: process.env.NODE_ENV === 'production',     // localhost는 false
  sameSite: 'lax',                                   // CSRF 방어 + Magic Link cross-site 호환
  path: '/',
  // maxAge: Supabase가 관리 (refresh token + access token)
}
```

> ⚠️ **`sameSite='strict'` 대신 `'lax'` 채택 사유**:
> - 매직 링크 클릭은 이메일 도메인(gmail.com 등) → localhost로의 **cross-site GET 네비게이션**
> - `'strict'`이면 PKCE `code_verifier` 쿠키가 전송되지 않아 `exchangeCodeForSession()` 실패
> - `'lax'`는 GET-only cross-site 시 쿠키 전송, POST/PUT는 차단 → CSRF 방어 효과 거의 동등
> - OAuth/Magic Link 표준 패턴이며 Supabase 공식 가이드도 `'lax'` 권장

`@supabase/ssr` 패키지의 `createServerClient`가 위 옵션을 자동 적용. 별도 쿠키 핸들러 작성 불필요.

---

## 4. Magic Link 설정 (Supabase Dashboard)

| 항목 | 값 | 비고 |
|---|---|---|
| Email Provider | **Enabled** | 사용자 작업 |
| Confirm Email | **Disabled** | 1인 자기 자신만이라 불필요 |
| Magic Link Expiry | 3600초 (1시간) — 기본값 유지 | |
| Site URL | `http://localhost:3000` | Phase 1 (Phase 2에서 Vercel URL로 교체) |
| Redirect URLs (allow list) | `http://localhost:3000/auth/callback` | Phase 1 |

---

## 5. 환경 변수

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...        # 서버 전용 (Phase 1엔 거의 사용 X)
OWNER_EMAIL=min5859@gmail.com
NEXT_PUBLIC_APP_URL=http://localhost:3000   # 매직 링크 redirect 기준
AI_KEY_ENCRYPTION_SECRET=...                # 64 hex chars
```

---

## 6. API 명세

### 6.1 `POST /api/auth/send-magic-link`

**Request**:
```json
{ "email": "user@example.com" }
```

**Response** (allowlist or not, 모두 동일):
```json
{ "ok": true, "message": "If this email is registered, a magic link has been sent." }
```
- HTTP 200 (always — enumeration 차단)
- 입력 형식 오류만 400 (zod 검증 실패)

### 6.2 `GET /auth/callback?code=...`

- 성공 시: `302 → /dashboard`
- 실패 시: `302 → /login?error=<code>`
- 에러 코드: `auth_failed | session_failed | invalid_callback | unauthorized_email | internal_error`

### 6.3 `POST /api/auth/logout`

**Response**: `{ "ok": true }` + 쿠키 삭제 → 클라이언트가 `/login`으로 push

---

## 7. 미들웨어 동작

```
1. 요청 URL이 public 라우트면 통과 (login, auth/callback, api/auth, _next, favicon)
2. Supabase SSR getUser() 호출
3. user.email !== OWNER_EMAIL 또는 user 없음 → /login?error=session_expired
4. 통과 시 NextResponse.next()
```

**matcher**: `'/((?!_next/static|_next/image|favicon.ico|login|auth/callback|api/auth).*)'`

---

## 8. UI 와이어프레임

### `/login`

```
┌────────────────────────────────────┐
│  japa                              │
│  ────────                          │
│  자산을 한눈에                      │
│                                    │
│  Email                             │
│  ┌──────────────────────────────┐  │
│  │  you@example.com             │  │
│  └──────────────────────────────┘  │
│                                    │
│  [ Send Magic Link ]               │
│                                    │
│  매직 링크가 메일로 발송됩니다.    │
│  메일이 안 오면 스팸함 확인.       │
│                                    │
│  (에러 시: 친화적 메시지)          │
└────────────────────────────────────┘
```

### `/dashboard` (Phase 1 stub)

```
┌────────────────────────────────────┐
│  japa | min5859@gmail.com  [Logout]│
│  ────────────────────────────────  │
│                                    │
│  ✅ 로그인 성공                     │
│                                    │
│  자산 데이터 입력은 다음 단계에서  │
│  구현됩니다.                       │
└────────────────────────────────────┘
```

---

## 9. 검증 절차 (Check Phase)

| Step | 방법 | 통과 조건 |
|---|---|---|
| 1. TypeScript 컴파일 | `npx tsc --noEmit` | 에러 0 |
| 2. 빌드 | `npm run build` | 성공 |
| 3. Lint | `npm run lint` | 에러 0 (warning OK) |
| 4. 본인 이메일 로그인 | 수동 (사용자) | 메일 수신 → 클릭 → /dashboard |
| 5. 비-allowlist 이메일 | 수동 | 메일 미발송 (Supabase Auth 로그 확인) |
| 6. 비인증 보호 라우트 접근 | 수동 | /login redirect |
| 7. 쿠키 httpOnly | DevTools | 체크박스 ON |
| 8. 로그아웃 | 수동 | 쿠키 삭제 + /login redirect |

---

## 10. Decision Record

| 결정 | 사유 |
|---|---|
| 4-Gate 패턴 (Client/API/Callback/Middleware) | 단일 실패점 제거, 다층 방어 |
| **클라이언트가 Supabase에 직접 호출 금지** | OTP spam·enumeration 방어. 모든 호출은 API 라우트 경유 |
| 비-allowlist도 200 generic 응답 | Email enumeration 차단 (OWASP A07) |
| Magic Link 만료 1시간 (Supabase 기본) | 보안·UX 균형. 짧으면 불편, 길면 위험 |
| `@supabase/ssr` 사용 | 쿠키·refresh 자동화, 직접 JWT 검증 회피 |
| 미들웨어에서 `getUser()` (jose 등 직접 검증 X) | Supabase 표준 패턴, 단순성. 1인 앱이라 latency 무시 가능 |
| zod로 API 입력 검증 | 타입 안전 + 런타임 검증, 표준 라이브러리 |
| `emailRedirectTo` 하드코딩 (env 변수에서) | Open redirect 차단 |
| 에러 메시지 generic | 정보 누출 방어 (OWASP A07) |

---

## 11. Implementation Guide

### 11.1 Module Map

| 모듈 | 파일 | 의존성 |
|---|---|---|
| **M1: Supabase 클라이언트** | `lib/supabase/{client,server,middleware}.ts` | @supabase/ssr |
| **M2: Allowlist 헬퍼** | `lib/auth/allowlist.ts` | env(OWNER_EMAIL) |
| **M3: 미들웨어** | `middleware.ts` | M1, M2 |
| **M4: API 라우트** | `app/api/auth/{send-magic-link,logout}/route.ts` | M1, M2, zod |
| **M5: 콜백** | `app/auth/callback/route.ts` | M1, M2 |
| **M6: 로그인 UI** | `app/login/{page,login-form}.tsx` | M4 (fetch) |
| **M7: 대시보드 stub** | `app/dashboard/{page,logout-button}.tsx` | M1, M4 |

### 11.2 Recommended Session Plan

- **세션 1 (현재)**: M1~M7 한 번에 — 모듈 간 결합도 높아 분리 시 검증 어려움
