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

### A2. ✅ 해결됨 — yahoo-finance2 npm 라이브러리 도입 (2026-04-29)
- **최종 결정**: Python yfinance 사이드카 대신 **yahoo-finance2 npm 라이브러리**로 전환
- **경과**:
  - 2026-04-27: Yahoo v8 직접 호출(Node fetch) 채택
  - 2026-04-28: HTTP 429 빈발 → 백오프 + 멀티 호스트 + 풀 브라우저 헤더 추가
  - 2026-04-29 (오전): 위 보강에도 100% 429 재현. IP 차단으로 의심
  - 2026-04-29 (오후): 진단 결과 — IP 차단이 아니라 **Node OpenSSL의 TLS ClientHello fingerprint(JA3) 가 Yahoo 봇 감지에 잡히는 것**이 원인. 풀 브라우저 헤더는 오히려 트리거를 강화하던 상태
  - `child_process` curl spawn으로 우회 시도 → TLS 문제는 해결되지만 IP rate limit에 별개로 노출
  - **최종**: 다른 자산관리 프로젝트(asset-dashboard)에서 동작 검증된 `yahoo-finance2` 라이브러리(v3.14.0)로 전환. crumb/cookie 인증과 다중 endpoint fallback이 라이브러리 내부에서 처리됨
- **장점**:
  - Python·외부 프로세스 의존성 0
  - Vercel 단일 호스팅 유지 (Phase 2 배포 단순)
  - 한국 종목 `.KS`/`.KQ` 자동 처리, 배당·재무 부가 데이터 가용
- **참고**: `lib/quotes/yahoo.ts`, `docs/01-plan/features/yahoo-quotes.plan.md` §3·6

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

### F9. 시장 지표 대시보드 (인덱스·환율·금리)
- **상태**: 미구현 — Phase 1 Step 7 본 대시보드와 별도 모듈 또는 하단 섹션
- **목적**: 본인 자산 외에 **시장 컨텍스트**를 한 화면에서 확인 → 매수·매도 타이밍 감각, 환율 영향 추적
- **데이터 소스**: 이미 도입된 `yahoo-finance2` 그대로 사용 (별도 의존성 0)
  - `yahooFinance.quote(symbol)` → 현재가·전일종가
  - `yahooFinance.chart(symbol, { period1, period2, interval: "1d" })` → 1년치 일봉
- **표시 심볼 (asset-dashboard 참고)**:
  - 환율: `USDKRW=X`, `EURKRW=X`, (필요 시 `JPYKRW=X`)
  - 지수: `^KS11`(KOSPI), `^KQ11`(KOSDAQ), `^GSPC`(S&P500), `^IXIC`(NASDAQ), `^DJI`(다우), `^N225`(닛케이)
  - 금리: `^TNX`(미국 10년물 국채)
- **UI 구성안**:
  - 카드형 그리드: 심볼·현재값·전일대비·등락률 + 미니 1년 라인차트 (Recharts `LineChart`)
  - 환율 카드는 자산 평가 환산값에 직접 영향 → 대시보드 상단 고정
- **데이터 갱신**: Step 7의 `/api/prices/refresh` 또는 별도 `/api/market/refresh`. `price_cache` 테이블에 동일 스키마로 저장 (ticker만 위 심볼들이 들어가는 형태)
- **트리거**: Step 7 본 대시보드 1차 완성 직후 (~Phase 1 마무리)
- **참고**: 다른 PC의 `asset-dashboard/lib/market.ts` 구조 일부 차용 가능

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
