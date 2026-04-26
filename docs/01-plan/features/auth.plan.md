# Plan — auth (인증 시스템)

> Phase 1 MVP의 Step 3. Supabase Auth Magic Link + 이메일 Allowlist로 본인만 접속 가능한 인증 시스템 구축.

**Feature**: `auth`
**Phase**: PDCA Plan (Team Mode)
**상위 문서**: `docs/01-plan/phase-1-mvp-plan.md` §9
**작성일**: 2026-04-26

---

## Executive Summary

| 관점 | 내용 |
|---|---|
| **Problem** | 누구나 URL에 접속할 수 있는 상태. 본인(min5859@gmail.com) 외엔 절대 접근 불가하도록 잠가야 함. 비밀번호 관리 부담은 피하고 싶음. |
| **Solution** | Supabase Magic Link + 이메일 Allowlist + 4-Gate 서버 검증. 비번 없이 이메일 한 번 클릭으로 로그인. |
| **Function/UX 효과** | `/login` 진입 → 이메일 입력 → 메일함 클릭 → `/dashboard`. 본인 외 이메일은 **메일조차 발송되지 않음**. |
| **Core Value** | 1인 앱 보안의 표준 패턴. 비밀번호 노출·재사용·약한 비번 사고 모두 회피. |

---

## Context Anchor

| 키 | 값 |
|---|---|
| **WHY** | URL 공개 환경에서 본인만 접근 가능하게 잠그기 (Vercel 공개 배포 대비) |
| **WHO** | 1인 사용자 (min5859@gmail.com) |
| **RISK** | 토큰 탈취, 매직 링크 가로채기, 이메일 enumeration, OTP spam, open redirect |
| **SUCCESS** | (1) 본인 이메일로만 로그인 (2) 다른 이메일 입력 시 메일 발송 X (3) 세션 쿠키 httpOnly+sameSite (4) 보호 라우트 무인증 시 /login redirect |
| **SCOPE** | 인증 플로우 + 보호 미들웨어 + 로그인 UI + 콜백 처리 + 로그아웃 |

---

## 1. Requirements

### Functional
- F1. 본인 이메일(`OWNER_EMAIL`)만 로그인 가능
- F2. Magic Link 방식 (비번 없음)
- F3. 보호 라우트(`/dashboard`, `/accounts`, `/settings` 등) 미인증 시 `/login` redirect
- F4. 로그아웃 버튼으로 세션 종료
- F5. 로그인/콜백 에러 시 사용자 친화적 메시지

### Non-Functional
- NF1. 4-Gate 서버 검증 (Client form / API / Callback / Middleware)
- NF2. 세션 쿠키: `httpOnly + sameSite=strict + secure(prod 자동)`
- NF3. **이메일 enumeration 차단**: 비-allowlist 이메일도 동일 메시지 반환
- NF4. **Open redirect 차단**: `emailRedirectTo` 하드코딩
- NF5. CSRF: 매직 링크 채널 자체 보호 + sameSite 쿠키
- NF6. 모든 보안 검증은 **서버 사이드**

### Out of Scope (Phase 2+)
- 다중 사용자 / 가족 공유
- 소셜 로그인 (Google, Kakao 등)
- 2단계 인증 (TOTP)
- Rate limiting (Upstash Redis 등)
- 비밀번호 기반 로그인

---

## 2. Success Criteria

| # | 기준 | 검증 방법 |
|---|---|---|
| SC-1 | `/login`에서 본인 이메일 입력 → 매직 링크 메일 수신 | 수동 검증 |
| SC-2 | 매직 링크 클릭 → `/dashboard` 정상 진입 | 수동 검증 |
| SC-3 | 비-allowlist 이메일 입력 시 메일 발송되지 않음 (Supabase 로그 확인) | 수동 검증 |
| SC-4 | 비인증 상태로 `/dashboard` 진입 시 `/login` redirect | 수동 검증 |
| SC-5 | 세션 쿠키가 `httpOnly` 설정됨 (DevTools Application 탭) | 수동 검증 |
| SC-6 | 로그아웃 버튼 클릭 → 세션 쿠키 제거 → `/login` redirect | 수동 검증 |
| SC-7 | `npm run build` 성공 (TypeScript 에러 없음) | 자동 검증 |

---

## 3. Risks & Mitigations

| 리스크 | 영향 | 대응 |
|---|---|---|
| 매직 링크 가로채기 | 세션 탈취 | 짧은 만료(1시간 default), 일회용, HTTPS 강제(prod) |
| Email enumeration | 본인 이메일 노출 | 비-allowlist도 동일 generic 응답 |
| Open redirect | 피싱 사이트 redirect | `emailRedirectTo` 하드코딩 + `/auth/callback`에서도 redirect URL 화이트리스트 |
| Service role key 유출 | RLS 우회 | `.env.local`만 보관, 코드에 노출 X, anon key 사용 우선 |
| OTP 발송 spam | Supabase 메일 quota 소진 | API 라우트 server-side allowlist 검증 (직접 Supabase 호출 차단) |
| 세션 만료 미감지 | 끊긴 채로 사용 | 미들웨어에서 매 요청 검증 + Supabase SSR auto-refresh |

---

## 4. Dependencies

- ✅ Supabase Seoul 프로젝트 (생성 완료)
- ✅ `0001_initial.sql` 마이그레이션 (적용 필요 — 사용자가 SQL Editor에서 실행)
- ✅ `@supabase/ssr ^0.10.2`, `@supabase/supabase-js ^2.104.1` (Step 1에서 설치 완료)
- ⏳ `zod` (Step 3에서 신규 설치 — 입력 검증용)
- ⏳ Supabase Auth Email Provider 활성화 (사용자가 Dashboard에서 확인)
- ⏳ `.env.local` 작성 (사용자 — Supabase URL, anon key, OWNER_EMAIL 등)

---

## 5. Stakeholders

- **Owner**: min5859@gmail.com
- **Reviewers**: cto-lead, security-architect (이미 리뷰 완료, OWASP A01/A02/A07 등 커버)
- **Implementer**: AI (Code) + 사용자 (`.env.local` 작성, Supabase Auth Provider 설정)
