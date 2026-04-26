# 개인 자산관리 프로그램 (japa)

> 여러 계좌를 한 화면에서 보고, 한국 세법(종합금융소득세·해외주식 양도소득세) 기반 세무 관리와 AI 재무 코칭을 제공하는 개인용 웹 앱.

---

## 프로젝트 레벨
- **Dynamic** (풀스택 + DB + 외부 API + AI) → bkit `/dynamic` 활용
- 사용자: **1인 전용 (Single-user)** — 멀티유저 X, 본인만 사용

## 개발·배포 단계
- **Phase 1 (MVP)**: **로컬 개발·실행만** (Vercel 배포 X)
  - `npm run dev` → `localhost:3000`
  - **Supabase는 호스팅 인스턴스 사용** (supabase.com 무료 티어) — 로컬 Docker는 사용 안 함
  - 장점: Docker 불필요, Phase 2 배포 시 마이그레이션 없이 그대로 이어감
- **Phase 2~ (정식 운영)**: Vercel 배포
  - URL은 공개되지만 **Supabase Auth + 이메일 Allowlist**로 본인만 접근

---

## 핵심 기능 (6개)

1. **계좌 통합 대시보드** — 전체 자산·자산군별 비중·계좌별 수익률, KRW/USD 환산
2. **계좌 카테고리** — 일반 / ISA / 연금저축 / IRP / 퇴직연금 / 해외주식 구분, 과세 방식 자동 태깅
3. **종합금융소득세 관리 (국내)** — 이자+배당 연간 누계, **2,000만원 임계선 알림**, 분리과세(15.4%) vs 종합과세(6~45%) 시뮬레이션
4. **해외주식 양도소득세** — FIFO 양도차익 계산, **연 250만원 기본공제** 차감, 세율 **22%** (양도 20% + 지방 2%), 연말 손절 시뮬레이션
5. **시세 조회** — Yahoo Finance (무료, 일일 배치 + 수동 갱신), 국내는 `.KS`/`.KQ` 접미사
6. **AI 재무 코치** — 자산 배분 분석 / 리밸런싱 / 절세 전략 제안. **멀티 LLM 지원** (OpenAI · Gemini · Claude · DeepSeek 등 사용자가 키 등록·선택)

---

## 기술 스택 (확정)

| 영역 | 선택 |
|---|---|
| 프론트엔드 | **Next.js 15 (App Router)** + Tailwind + Recharts |
| 백엔드 | **Next.js API Routes** + Python 마이크로서비스 (yfinance 용) |
| DB | **Supabase** (PostgreSQL) |
| 시세 API | `yfinance` (Python 사이드카) 또는 Yahoo v8 엔드포인트 직접 호출 |
| AI | **멀티 프로바이더 지원** — OpenAI / Gemini / Claude / DeepSeek 등 사용자가 API Key 등록·전환 가능 (활용 깊이 TBD) |
| 인증 | **Supabase Auth + 이메일 Allowlist** (매직 링크, 본인 이메일만 통과) |
| 배포 | Phase 1: **로컬 (`localhost:3000`)** / Phase 2~: Vercel |
| 데이터 입력 | **수동 입력** (MVP), CSV 임포트는 Phase 2 이후 |

---

## 데이터 모델 (개념) — 1인 전용

> 1인 전용이므로 `User` 테이블·`user_id` FK는 **생략**. 단순함 우선.

```
Account (broker, account_type, currency)
 └─ Holding (ticker, market, quantity, avg_cost_price)
     └─ Transaction (type: buy/sell/dividend/interest/fee,
                     amount, tax_withheld, trade_date)

PriceCache (ticker, date, close_price, currency)
FxRate (date, USD_KRW, ...)
TaxSummary (year, dividend_total, interest_total, foreign_gain, estimated_tax)
AIInsight (date, type, content)
AIProvider (name, api_key_encrypted, model, is_active)  -- 멀티 LLM 지원
```

---

## 개발 로드맵

| Phase | 내용 | 기간 |
|---|---|---|
| **1. MVP** | 계좌/종목/거래 CRUD, Yahoo 시세 배치, 대시보드, CSV 임포트 | 1~2주 |
| **2. 세무 엔진** | 배당·이자 누계 + 2,000만원 알림, 양도차익 FIFO, 세금 시뮬레이터 | 1주 |
| **3. AI 코칭** | Claude 연동, 월간 리포트, 절세 제안 프롬프트 | 3~5일 |
| **4. 고도화** | 리밸런싱 시뮬레이터, 백테스트, 모바일 | 선택 |

---

## 핵심 원칙 / 주의사항

- **세금 계산은 반드시 결정론적 코드로** 수행. AI는 해석·조언만 담당 (환각 방지).
- UI에 **"참고용 추정치"** 경고 문구 필수 — 실제 세무신고 대용 불가.
- **환율**: 해외주식 양도소득세는 **거래일 기준환율** 적용 (한국은행 고시환율).
- Yahoo Finance는 **비공식 API** — rate limit 대응, 캐싱 필수, 실패 시 수동 입력 fallback.
- 한국주식 커버리지 불완전 → 네이버 금융 파싱 백업안 준비.
- 금융 데이터는 민감 정보 → 로컬 암호화, 환경변수 관리, 2차 인증 고려.

---

## 한국 세법 요약 (구현 시 참조)

### 종합금융소득세
- 이자 + 배당 합계 **≤ 2,000만원** → 분리과세 15.4% (원천징수로 종결)
- **> 2,000만원** → 종합과세 (다른 종합소득과 합산, 누진세율 6~45%)

### 해외주식 양도소득세
- 과세표준 = (연간 양도차익 합계) − **250만원 기본공제**
- 세액 = 과세표준 × **22%** (양도소득세 20% + 지방소득세 2%)
- 신고·납부: **매년 5월** (전년도 분)
- 손익통산 가능 → 연말 손절 전략 활용

### 특수목적 계좌 (간단 정리)
- **ISA**: 비과세 한도 200만원(일반형)/400만원(서민형), 초과분 9.9% 분리과세
- **연금저축/IRP**: 세액공제(연 900만원 한도), 수령 시 연금소득세
- **퇴직연금(DC/DB)**: 수령 시 퇴직소득세 또는 연금소득세

---

## 작업 방식 지침

- 코드 구현 전 반드시 **설계 문서** 확인/작성 (PDCA 규칙)
- 세금 관련 계산은 **단위 테스트 필수**
- Yahoo Finance 호출은 **캐싱 + 재시도** 로직 기본 탑재
- AI 프롬프트는 별도 파일(`/prompts`)로 분리 관리
- AI 호출은 **프로바이더 추상화 레이어**(`/lib/ai/providers/`)를 두어 OpenAI/Gemini/Claude/DeepSeek 교체 가능하게 설계 (Vercel AI SDK 활용 검토)
- AI API Key는 **암호화 후 Supabase에 저장** (또는 Vercel 환경변수 사용도 가능 — 1인 전용이라 단순화 선택지 있음)
- 1인 전용이라도 Vercel은 공개 URL이므로 **반드시 인증 + 본인 이메일 allowlist** 적용
- Supabase **automatic RLS 이벤트 트리거 활성화** (advisor 권장) → `public` 새 테이블에 RLS 자동 ON
- 모든 테이블 RLS + policy 한 쌍으로 작성 (1인 전용이라 정책은 `auth.role() = 'authenticated'` 단순 형태)
- 금액은 **Decimal** 타입 사용 (부동소수점 오차 방지)

---

## 환경 정보

- **Owner Email (Allowlist)**: `min5859@gmail.com`
- **Supabase 프로젝트**:
  - ✅ Seoul (`ap-northeast-2`) 리전으로 신규 생성 완료 (2026-04-26)
  - 기존 Mumbai 프로젝트 데이터는 **수동 재입력** (마이그레이션 생략)
  - Connection: Session Pooler (포트 5432, IPv4)
  - Automatic RLS 이벤트 트리거 활성화 권장
  - Host/User/Password 등 시크릿은 **`.env.local`에만** 저장 (Git 커밋 금지)

## 문서 구조

```
docs/
├── 01-plan/        — Plan 문서 (요구사항·범위·로드맵)
├── 02-design/      — Design 문서 (상세 설계, 필요 시)
├── 03-analysis/    — Gap/Code 분석 결과
└── 04-report/      — PDCA 완료 리포트
```

현재 문서:
- `docs/01-plan/phase-1-mvp-plan.md` — Phase 1 MVP 청사진
- `docs/TODO.md` — 향후 검토 사항 (ORM/SMTP/배포/보안 강화 등)
  - 새 결정·보류 항목 발생 시 여기에 추가
  - Phase 종료 또는 분기마다 우선순위 재정렬

## 결정 사항 (2026-04-26 확정)

1. ✅ **사용 환경**: 로컬 개발 → 추후 Vercel 배포 (단계적)
2. ✅ **사용자 수**: 1인 전용 (멀티유저 X)
3. ✅ **데이터 입력**: 수동 입력 (MVP), CSV/Open API는 후속 검토
4. ✅ **개발 언어**: TypeScript (Next.js 15 App Router)
5. ✅ **DB**: Supabase (PostgreSQL)
6. ✅ **인증**: Supabase Auth + 이메일 Allowlist (매직 링크)
7. ✅ **AI**: 멀티 프로바이더 (OpenAI/Gemini/Claude/DeepSeek 등) — 사용자가 키 등록·전환
8. ⏳ **AI 활용 깊이**: TBD — Phase 3 진입 전 결정
   - 옵션 A: 월간 리포트만 (단순, 토큰 비용 ↓)
   - 옵션 B: 대화형 챗봇까지 (UX 풍부, 토큰 비용 ↑)
