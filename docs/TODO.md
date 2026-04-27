# japa — TODO / 향후 검토 사항

> 지금 당장 하지 않지만 잊지 않을 항목들. 시점이 오면 검토.
> 마지막 업데이트: 2026-04-27

---

## 📐 아키텍처·기술 스택 검토

### A1. ORM 도입 검토 (Prisma / Drizzle)
- **상태**: 보류 — 현재는 `supabase-js` + `supabase gen types`로 진행
- **검토 시점**: Phase 4 (고도화) 또는 쿼리 복잡도가 임계점 넘을 때
- **검토 포인트**:
  - Prisma: RLS 우회 문제 + 인증 분리 → 도입 부담 큼
  - **Drizzle ORM** (Supabase 친화적, RLS 표현 가능) — 우선 검토 대상
  - 대안: `supabase gen types`로 타입 안전성 확보로 충분한지 평가
- **트리거**: 쿼리 빌더 매핑이 복잡해지거나 N+1 문제가 자주 생길 때
- **참고**: 결정 기록은 본 대화 로그 (2026-04-26)

### A2. 시세 연동 — Python yfinance 사이드카로 전환 검토
- **상태**: 보류 — Phase 1은 **Yahoo v8 직접 호출 (Node fetch)** 채택 (2026-04-27 확정)
- **결정 근거 (2026-04-27)**:
  - 1인 + 보유 종목 수 제한 → 커버리지 문제 거의 없음
  - Vercel 단일 호스팅으로 Phase 2 인프라 단순화
  - 단순함 우선 원칙 (CLAUDE.md)
- **재검토 트리거**:
  - Yahoo v8 비공식 엔드포인트가 차단·스펙 변경되어 다수 종목이 실패
  - 보유 종목이 50개 이상으로 증가
  - 배당 이력·분할·재무제표 등 yfinance 고유 데이터가 필요해질 때 (Phase 3 AI 코치 고도화 시점)
  - 한국 코스닥 등 일부 종목이 v8에서 데이터 누락 빈번
- **전환 방법 (해당 시점에)**:
  - FastAPI + `yfinance` 단일 컨테이너 (Railway $5/월 또는 Fly.io 무료 티어)
  - Next.js → 내부 HTTP로 사이드카 호출
  - `price_cache` 스키마는 그대로 유지 (소스만 교체)
- **참고**: `docs/01-plan/phase-1-mvp-plan.md` §8

### A3. Vercel AI SDK 도입 검토
- **상태**: 직접 추상화 레이어로 구현 예정 (Phase 3 진입 시)
- **검토 포인트**: OpenAI/Anthropic/Google 통합 인터페이스 vs 직접 구현 트레이드오프
- **트리거**: AI 코치 (Phase 3) 본격 구현 직전

---

## 🔐 보안·인프라 강화

### S1. Custom SMTP (Resend / SendGrid)
- **상태**: 현재 Supabase 기본 메일 발송
- **문제**: Free tier 시간당 3-4통 제한 → 매직 링크 rate limit 자주 도달
- **해결**: Resend(무료 100통/일) 또는 SendGrid 연결 후 Supabase Auth → Settings → SMTP에 등록
- **트리거**: Phase 2 (정식 운영) 직전 또는 rate limit 자주 마주칠 때

### S2. Rate Limiting on `/api/auth/send-magic-link`
- **상태**: 미적용 (Phase 1 1인 사용이라 위험 낮음)
- **방법**: Upstash Redis + `@upstash/ratelimit` 또는 Vercel KV
- **트리거**: Vercel 배포 후 외부 노출 시점

### S3. Security Headers (`next.config.ts`)
- **상태**: 미설정
- **추가할 헤더**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security` (prod only)
  - `Content-Security-Policy` (점진적 도입)
- **트리거**: Phase 2 (Vercel 배포) 진입 시

### S4. AI 키 회전 도구 (`key_version` 운영 스크립트)
- **상태**: DB 컬럼은 준비됨, 운영 스크립트 미구현
- **필요 시기**: 첫 키 회전 발생 시 (1년에 1번 정도)
- **방법**: `lib/ai/crypto.ts`에 `reencryptAll(oldVersion, newVersion)` 함수 추가

### S5. Audit Log 테이블
- **상태**: 1인 사용이라 우선순위 낮음
- **추가 시점**: 가족 공유로 확장하거나 컴플라이언스 요구 발생 시
- **참고**: security-architect 리뷰에서 🟡 RECOMMENDED로 제안됨

### S6. 2FA (TOTP)
- **상태**: 1인 사용이라 우선순위 낮음
- **검토 시점**: Phase 2 이후 + 자산 규모 큰 경우

---

## 🌐 배포·운영

### O1. Vercel 배포 (Phase 2)
- **사전 작업**:
  - Supabase Site URL을 Vercel 도메인으로 추가
  - `NEXT_PUBLIC_APP_URL` 환경변수를 Vercel에 설정
  - `OWNER_EMAIL`, `SUPABASE_*`, `AI_KEY_ENCRYPTION_SECRET` 모두 Vercel Secrets에 등록
  - Auth Redirect URLs에 prod URL 추가

### O2. 백업 전략
- **상태**: Supabase Free tier 기본 백업 의존
- **검토 시점**: 자산 데이터가 의미 있게 쌓인 후 (Phase 2)
- **방법**: 주 1회 `pg_dump`를 GitHub Actions로 자동화 + 암호화 저장

### O3. 도메인 연결
- **검토 시점**: Vercel 배포 후

---

## 📊 기능 확장 (Phase 2~4 로드맵에 정의됨)

### F1. 종합금융소득세 엔진 (Phase 2)
- 이자·배당 누계 + 2,000만원 임계 알림
- 분리과세 vs 종합과세 시뮬레이터

### F2. 해외주식 양도소득세 엔진 (Phase 2)
- FIFO 양도차익
- 250만원 기본공제 + 22%
- 손익통산 + 연말 손절 시뮬레이터

### F3. AI 재무 코치 (Phase 3)
- 자산 배분 분석
- 리밸런싱 제안
- 절세 전략

### F4. CSV 임포트 (Phase 2)
- 증권사별 거래내역 CSV 파싱
- 스키마 매핑 UI

### F5. 한국은행 환율 API 연동 (Phase 2)
- ECOS API key 등록
- 양도소득세 거래일 기준환율 정확도 향상

### F6. 모바일 대응 (Phase 4)
- 반응형 → PWA → React Native 검토

### F7. 리밸런싱 시뮬레이터 (Phase 4)
- 목표 비중 vs 현재 비중
- 매수·매도 추천

### F8. 백테스트 (Phase 4)
- 과거 자산 배분의 가상 수익률

---

## 🛠 기술 부채·정리

### T1. Supabase 타입 자동 재생성 자동화
- **현재**: 수동으로 `npx supabase gen types`
- **개선**: pre-commit hook 또는 CI에서 자동 갱신
- **트리거**: 스키마가 자주 변경되어 수동 갱신이 번거로워질 때

### T2. lint·prettier 설정 보강
- **상태**: Next.js 기본 ESLint
- **추가 검토**: prettier, simple-import-sort, eslint-plugin-tailwindcss

### T3. 단위 테스트 프레임워크
- **상태**: 미설정 (`lib/ai/crypto.ts`만 임시 검증)
- **검토**: Vitest + 세금 계산 로직(Phase 2) 본격화 시점

### T4. e2e 테스트 (Playwright)
- **검토 시점**: Phase 1 마무리 후 핵심 플로우 회귀 방지용

### T5. 에러 로깅 (Sentry 등)
- **검토 시점**: Vercel 배포 + 안정성 이슈 발생 시

---

## 📝 문서·운영

### D1. 첫 사용자 가이드 (README 보강)
- 현재 README는 create-next-app 기본
- `.env.local` 작성, Supabase 연동, DB 마이그레이션 실행 가이드 추가

### D2. ADR (Architecture Decision Records) 추가
- 주요 의사결정을 docs/decisions/ 폴더에 ADR 형식으로 누적
- 예: "ADR-001 Supabase 채택", "ADR-002 sameSite=lax 변경"

---

## ✅ 항목 처리 규칙

- 항목 처리 시: 체크박스 추가 후 commit 메시지에 명시
- 항목 추가 시: 발생 시점·트리거·근거 함께 기록
- 분기마다(또는 Phase 종료 시) 검토하여 우선순위 재정렬
