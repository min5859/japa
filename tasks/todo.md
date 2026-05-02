# TODO — toy/japa 비교 후 도출한 개선 항목

비교 대상: `/Users/wooki/project/toy/japa/` (Supabase 직접 + 설계 단계 프로젝트)
작성일: 2026-05-02

---

## 1. UI/레이아웃

- [x] **사이드바 네비게이션으로 전환** (결정사항 확정)
  - 데스크톱(md+): 좌측 고정 사이드바 (w-56)
  - 모바일: 햄버거 토글로 슬라이드 오버
  - `RefreshPricesButton` / `LogoutButton` → 본문 상단 toolbar에 배치 (페이지별 작업 버튼과 일관성 유지)
  - `/login` 경로는 사이드바 노출 제외 (`isAuthPage` 분기 유지)
  - 신규 파일: `components/layout/app-shell.tsx` (사이드바 상태 관리 client wrapper)

---

## 2. 기능 — 가치 큰 순

- [ ] **배당 내역 기록 기능 (Dividend 모델 신규 추가)** ⭐⭐⭐
  - 현재 한계: `Holding.dividendYield(%)` 로 "예상 배당"만 계산 — 실제 수령액 추적 불가, Tax 페이지 수치가 추정치에 머무름
  - 추가할 Prisma 모델 (toy/japa 설계 차용):
    ```
    Dividend {
      id, accountId, holdingId,
      dividendDate (DateTime), exDividendDate (DateTime?),
      amountPerShare, quantity, totalAmount, currency,
      taxAmount, netAmount,
      isTaxOverridden (Boolean, default false),
      memo,
      createdAt, updatedAt
    }
    ```
  - 자동 세율 적용 규칙 (계좌유형 × 시장):
    - 일반/CMA + 국내: 15.4%
    - 일반/CMA + 해외(USD): 15%
    - ISA / 연금저축 / IRP: 0%
  - UI: `/dividends` 페이지 신규 (목록 + 추가/수정/삭제 폼)
  - Tax 페이지 통합: "예상 배당" → "실수령 + 예상 미수령" 으로 분리 표시
  - CSV export 추가 (`/api/export/dividends`)

- [ ] **계좌 그룹(N:M) 기능** ⭐⭐
  - 현재 한계: `Account.type` enum + `isTaxAdvantaged` 플래그만 — "해외주식 전용 계좌만 묶어보기" 같은 사용자 정의 분류 불가
  - 추가할 모델:
    ```
    AccountGroup { id, name, description?, displayOrder }
    AccountGroupMember { accountId, groupId } // composite PK
    ```
  - UI: `/groups` 목록 + 상세 (그룹별 계좌 합산 표시), 계좌 편집 화면에서 그룹 다중 선택
  - 대시보드: 그룹별 필터/탭 옵션

- [x] **종목 자동 판별 (`detectSymbol`)** ⭐⭐
  - 현재 한계: 사용자가 `005930.KS` 형식을 직접 입력
  - 동작: 6자리 숫자 → KOSPI/KOSDAQ 판별 후 `.KS`/`.KQ` 자동 부여, 영문 티커는 그대로
  - 적용 위치: `components/forms/holding-form.tsx` 의 symbol 입력 onBlur
  - 참고: `toy/japa/src/lib/yahoo/symbols.ts`

- [ ] **수동 시세 갱신 쿨다운** ⭐
  - 현재 한계: 사용자가 갱신 버튼 연타 가능 (cron + 수동 동시 호출 위험도 동일)
  - 구현: `lib/market.ts:refreshAllPrices()` 진입부에서 `priceCache.fetchedAt` 최신값이 60초 이내면 스킵
  - 주의: cron 경로(`/api/cron/daily`)에는 미적용 — 수동 트리거 전용 옵션 인자로 분기
  - 토이가 아닌 신규 보강 항목 (토이도 이건 미구현)

---

## 3. 적용 비추천 (검토 결과 제외)

- ~~Stocks 마스터 테이블 분리~~ — 정규화 이득 < 마이그레이션 비용. 상장폐지 추적이 필요해지면 `Holding.status` 컬럼 추가로 충분.
- ~~ISA 200/400만원 비과세 한도 별도 추적~~ — 우선순위 낮음. 현재 `annualContributionLimit` 추적으로 1차 만족.
- ~~토이의 직렬+100ms sleep 패턴~~ — 현재 `mapWithConcurrency(6) + 재시도` 가 더 견고. 차용 가치 없음.

---

## 작업 순서 제안

1. **사이드바 전환** (UI 만족도 즉시 향상, 작업량 작음)
2. **종목 자동 판별** (HoldingForm 사용성 즉시 개선, 작업량 작음)
3. **수동 시세 갱신 쿨다운** (한 줄 가드, 작업량 작음)
4. **배당 내역 기록** (DB 마이그레이션 + 신규 페이지, 작업량 큼 — 별도 세션 권장)
5. **계좌 그룹** (DB 마이그레이션 + 신규 페이지 + 대시보드 통합, 가장 큼)

---

## Review (구현 후 기록)

> 각 항목 완료 시 여기에 무엇을, 왜, 어떻게 바꿨는지 한두 줄로 정리.
