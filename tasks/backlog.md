# Backlog — 다음에 진행할 후보

작성일: 2026-05-03
참고: 완료된 작업 히스토리는 `tasks/todo.md` (toy/japa 비교 계획) 및 git log 참조.

---

## ⭐⭐⭐ 본질적 가치

### [ ] Transaction (거래 내역) 추적 — **별도 세션 권장 (큰 작업)**
- **현재 한계**:
  - `Holding.averageCost`를 사용자가 직접 입력 → 추가 매수/매도 시 평단가 수동 재계산
  - 실현 손익 추적 불가 → Tax 양도세 페이지가 "미실현"만 보여줌
  - 계좌 cashBalance와 거래의 정합성 무관
- **모델 제안**:
  ```prisma
  enum TransactionType { BUY SELL DEPOSIT WITHDRAW DIVIDEND_REINVEST FEE OTHER }
  model Transaction {
    id            String           @id @default(cuid())
    accountId     String
    holdingId     String?            // BUY/SELL일 때 필수
    type          TransactionType
    tradeDate     DateTime         @db.Date
    quantity      Decimal?         @db.Decimal(24, 8)
    pricePerShare Decimal?         @db.Decimal(18, 6)
    amount        Decimal          @db.Decimal(18, 4)   // 항상 채움 (현금 흐름)
    fee           Decimal          @default(0) @db.Decimal(18, 4)
    currency      Currency         @default(KRW)
    fxRate        Decimal          @default(1) @db.Decimal(18, 8)
    notes         String?
    createdAt     DateTime         @default(now())
    account       Account          @relation(...)
    holding       Holding?         @relation(...)
    @@index([accountId, tradeDate])
    @@index([holdingId])
  }
  ```
- **연쇄 작업**:
  - server action에서 Transaction 입력 시 Holding.quantity·averageCost·Account.cashBalance 자동 갱신 (트랜잭션 처리)
  - 종목별 거래 히스토리 페이지 (`/holdings/[id]`에 탭 추가)
  - **Tax 양도세 페이지 통합**: SELL transaction 기반 실현 손익 표시 → "미실현 추정" → "실현 + 미실현 분리"
  - CSV export 추가 (`/api/export/transactions`)
- **작업량**: 큼 (모델 + actions + UI + 기존 페이지 통합 + 자동 갱신 트리거 = 한 번에 끝내야 의미 있음)
- **선행 의존**: 없음

### [ ] 자산 배분 목표 + 리밸런싱 추천
- **현재 한계**: 배분 파이는 보여주지만 "내가 원한 비율"이 없음 → 의사결정 못 함
- **구현 방향**:
  - 옵션 A (단순): `lib/allocation-targets.ts`에 사용자가 직접 편집하는 상수 객체
  - 옵션 B (DB): `AllocationTarget { assetClass, targetPct, threshold? }` 모델 + 설정 페이지
  - 대시보드에 "목표 vs 실제" 막대 비교 + 차이가 임계값(±5%) 초과 시 강조
  - "균형 맞추려면 KOSPI ETF X원 매도, 미국주식 Y원 매수" 추천 카드 (옵션)
- **작업량**: 중간 (옵션 A는 작음, B는 중간)
- **추천**: 옵션 A로 시작 → 익숙해지면 B로 승격

### [ ] 벤치마크 대비 수익률
- **현재 한계**: 내 ROI는 보이지만 KOSPI/S&P500 대비 알파 없음
- **구현 방향**:
  - PortfolioSnapshot 시계열 + MarketIndexHistory 결합
  - 첫 스냅샷 기준 정규화 (모두 100으로 시작) → 동일 스케일 라인 차트
  - "1개월 / 3개월 / 1년" 탭, 알파 한 줄 표시
- **데이터 의존**: PortfolioSnapshot 누적 필요. 5월 1건 수동 저장 후 매월 1일 자동. **유의미하려면 최소 3개월** 후 본격 가치.
- **작업량**: 중간 (lib + 차트 컴포넌트 + 대시보드 카드)
- **추천**: 지금 골격만 만들고 데이터 누적 대기

---

## ⭐⭐ 중간 가치

### [ ] 다크모드 — **즉시 가성비 좋음**
- 디자인 토큰(CSS 변수) 이미 잘 짜여 있어 토글 + dark variants 추가만
- shadcn pattern: `prefers-color-scheme` 자동 감지 + 사용자 토글 (localStorage)
- 작업량: 작음

### [ ] CSV/Excel 일괄 import — **첫 셋업 가속**
- 이미 export가 있으니 같은 컬럼 형식의 import만 만들면 됨
- 대상: Holdings, Dividends (일단), Accounts (선택)
- UI: `/import` 페이지 또는 각 목록 페이지에 "파일 업로드" 버튼
- 처리: 파일 파싱 → preview → 확인 후 createMany
- 작업량: 작음~중간

### [ ] 연도별 손익 리포트 — **세금 신고 시즌 유용**
- `/reports/yearly?year=2025` 라우트
- 배당 합계, 매도 실현 손익, 세금 합계, 계좌별 합계
- print-friendly 스타일 (또는 단순 PDF)
- **선행 의존**: Transaction 추적이 있으면 훨씬 정확. 없으면 dividend 위주로만.
- 작업량: 중간 (Transaction 후 진행 권장)

### [ ] 위험 지표 (max drawdown, 변동성)
- PortfolioSnapshot 시계열 기반
- 대시보드 카드 1~2개: "최대 낙폭", "월간 표준편차"
- **데이터 의존**: 스냅샷 6개월 이상 누적
- 작업량: 작음

### [ ] 검색/필터 (Holdings, Dividends 페이지)
- 종목명·티커·계좌별 필터
- 보유 항목이 늘어나면 가치 증가
- 작업량: 작음

---

## ⭐ 매력적이지만 큰 비용 (보류 권장)

| 아이디어 | 가치 | 비용 | 비고 |
|---|---|---|---|
| OpenBanking 연동 (계좌 자동 sync) | 매우 큼 | 매우 큼 | 한국 금융기관 OAuth + 인증서, 비공개 API. 위험·법적 이슈. |
| 알림 (Telegram/Slack/Email 봇) | 큼 | 큼 | 외부 인프라, cron 의존성, 사용자 token 관리 |
| 다국어 (i18n) | 작음 (1인 사용) | 큼 | next-intl 도입, 번역 작업. 1인 환경에선 ROI 낮음 |
| Notion/Google Sheets 동기화 | 작음 | 중간 | OAuth, 양방향 동기화 복잡 |
| 모바일 앱 / PWA 강화 | 중간 | 큼 | 현재도 모바일 사이드바 동작. 네이티브는 별 |
| 2FA / 보안 강화 | 작음 (단일 사용자) | 중간 | TOTP 라이브러리 도입 |

---

## 추천 진입점 (가성비 순)

1. **다크모드** — UI 만족도 즉시, 작업량 작음
2. **CSV import** — 첫 셋업/대량 입력 사용성 큰 폭 향상
3. **자산 배분 목표** (옵션 A) — 의사결정 도움, 작업량 작음
4. **검색/필터** — 보유 항목 늘면 가치 증가
5. **벤치마크 대비 수익률** — 골격 만들고 데이터 누적 대기
6. **Transaction 추적** — 본질 가치 가장 큼. **별도 세션 권장**.

---

## 별도 정비 사항 (이전 세션에서 미루어 둔 것)

- [ ] `middleware.ts` → `proxy.ts` 이름 변경 (Next.js 16 deprecation 경고)
- [ ] `force-dynamic` 일부 라우트 풀어 캐싱 도입 검토 (단일 사용자라 효과 제한적)
- [ ] DB 리전 ap-south-1 → ap-northeast-2 이전 (응답 속도 큰 폭 향상, 큰 작업)
- [ ] `refreshMarketHistory` 재발 방지: 빈 history symbol 자동 backfill 또는 명시적 alert (CL=F가 한 번 조용히 실패한 사례)

---

## 컨텍스트 (다음 세션이 빠르게 이해할 정보)

### 현재 구현된 기능
- **데이터 모델**: Account, Holding, Dividend, AccountGroup (N:M), PortfolioSnapshot, PriceCache, MarketIndex, MarketIndexHistory
- **페이지**: Dashboard, Accounts, Holdings, Dividends, Groups, Quote, Market, Tax, AI 분석, Login
- **자동화**: 매일 22:00 UTC cron — 시세/지수/지수 history 갱신, 매월 1일 스냅샷, 매년 1월 1일 contributionYTD 리셋
- **Export**: accounts/holdings/dividends/snapshots CSV (`/api/export/[type]`)
- **인증**: ADMIN_PASSWORD + HMAC 세션 토큰 (1인 사용)

### 기술 스택
- Next.js 16 (App Router, Turbopack dev), React 19, Tailwind 4, shadcn/ui, Recharts
- Prisma 6 + Supabase PostgreSQL (ap-south-1, pgbouncer)
- yahoo-finance2 (시세/검색/차트), Google Gemini (AI 분석)
- Vercel 배포 + Vercel Cron

### 코드 규약 / 골든 룰
- **"Simply the best"** — 추상화는 3+ 사용처 + 명확한 가치가 있을 때만
- 라벨/상수는 `lib/labels.ts`에 (단일 진실 원천)
- DB write는 server action 또는 API route에서만
- Prisma Decimal은 `toNumber()`로 변환 (`lib/utils.ts`)
- 폼은 useActionState + Zod safeParse + revalidatePath + redirect 패턴

### 부수 진단 메모
- **DB 리전 ap-south-1 (인도)**: 한국에서 RTT ~100~150ms. 페이지 전환 느림의 주 원인 중 하나.
- **Vercel cron 한도**: Hobby 플랜은 계정 전체 cron 2개. 다른 프로젝트도 cron 필요 시 GitHub Actions로 외부 호출이 우회책.
- **CL=F WTI 원유 history**: 1년 252행 backfill 완료 (2026-05-03). 이후 daily cron이 incremental 유지.
