# Step 6 — Yahoo Finance 시세 연동 (yahoo-finance2 라이브러리)

> 2026-04-29 갱신: v8 endpoint 직접 호출은 Node TLS fingerprint 차단 문제로
> 폐기. `yahoo-finance2` npm 라이브러리(v3.14.0)로 전환. 자세한 경과는
> `docs/TODO.md` A2 참조. 본 문서의 §3·§6 호출 다이어그램은 라이브러리 호출
> 기준으로 읽되, 외부에 노출되는 `fetchYahooQuote(symbol)` /
> `YahooFetchResult` 시그니처는 동일하게 유지된다.


> 작성: 2026-04-28
> 상태: Plan
> 결정 채택: A (Yahoo v8 직접 호출 / Node fetch) — TODO A2 참조

---

## 1. 목적

- 보유 종목의 **현재 시세**를 화면에 표시
- 평가금액(quantity × close) 및 **단순 수익률** ((close − avg_cost) / avg_cost) 계산
- 시세는 `price_cache`에 저장하고, 화면은 캐시에서 읽음 (Yahoo는 갱신 시에만 호출)

## 2. 비목표 (Phase 1 범위 외)

- **환율 변환** (KRW↔USD): Phase 2 세무 엔진에서 도입
- **실시간 스트리밍**: 일일 종가 기반
- **재무제표·배당·분할 데이터**: yfinance 사이드카(Phase 2+)에서 처리
- **자동 일일 배치 (cron)**: Phase 2 Vercel Cron Job
- 현재는 **수동 갱신 버튼**만으로 충분 (1인 + 매일 한 번 누르면 OK)

## 3. 데이터 소스

### Yahoo Finance v8 chart endpoint
```
GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5d
Headers: User-Agent: Mozilla/5.0 ... (필수, 미설정 시 403)
```

응답 핵심 필드:
- `chart.result[0].meta.regularMarketPrice` — 최신가 (현재가 또는 직전 종가)
- `chart.result[0].meta.currency` — 통화 코드
- `chart.result[0].meta.regularMarketTime` — 유닉스 시각 (epoch sec)
- `chart.result[0].meta.symbol` — 검증용

### 한국 시장 심볼 변환
- `005930` + `KR` → `005930.KS` 우선 시도, 실패 시 `005930.KQ` 재시도
  (KOSPI/KOSDAQ 구분이 holdings에 없으므로 fallback 패턴)
- 미국·일본·기타: 티커 그대로

| Holdings.market | 변환 규칙 |
|---|---|
| `KR` | `{ticker}.KS` → 실패 시 `{ticker}.KQ` |
| `US` | `{ticker}` 그대로 (예: AAPL, NVDA) |
| `JP` | `{ticker}.T` (도쿄증권거래소) |
| `OTHER` | `{ticker}` 그대로 |

## 4. 아키텍처

```
┌── UI (계좌 상세) ──────────────────────────────┐
│  RefreshQuotesButton (Client Component)        │
│   ↓ Server Action: refreshQuotesForAccount     │
└────────────────────────────────────────────────┘
                  │
       ┌──────────▼─────────┐
       │ lib/quotes/refresh │ ─── for each holding ───┐
       │  - holdings 조회    │                          │
       │  - 심볼 변환        │                          ▼
       │  - Yahoo 호출       │              lib/quotes/yahoo.ts
       │  - price_cache UPSERT│              fetch(v8 endpoint)
       └────────────────────┘                          │
                  │                                    ▼
       ┌──────────▼─────────┐                Yahoo Finance v8
       │ Service Role Client │
       │ (price_cache write) │
       └────────────────────┘

┌── UI 렌더링 시 ────────────────────────────────┐
│  Server Component: holdings + price_cache JOIN │
│   → 평가금액·수익률 계산해서 표 셀에 표시        │
└────────────────────────────────────────────────┘
```

### 왜 service role이 필요한가
- `price_cache`/`fx_rates`는 RLS가 SELECT만 허용 (`auth_read` 정책)
- INSERT/UPDATE는 service role만 가능 → 시세 갱신 시점에 service role 클라이언트 사용
- 사용자 페이지 로드 시 SELECT는 일반 anon 클라이언트로 충분 (RLS 통과)

## 5. 구현 파일

| 파일 | 역할 |
|---|---|
| `lib/supabase/admin.ts` | Service role 클라이언트 (`createSupabaseAdminClient`) — 시세 갱신 전용 |
| `lib/quotes/symbol.ts` | `toYahooSymbols(ticker, market)` — 우선·대체 심볼 배열 반환 |
| `lib/quotes/yahoo.ts` | `fetchYahooQuote(symbol)` — v8 fetch, User-Agent 설정, 응답 파싱 |
| `lib/quotes/refresh.ts` | `refreshQuotesForAccount(accountId)` Server Action — 보유종목 일괄 갱신, 결과 요약 반환 |
| `app/accounts/[id]/refresh-quotes-button.tsx` | Client Component — 버튼 + useTransition + 결과/에러 표시 |
| `app/accounts/[id]/page.tsx` | (수정) holdings 표에 현재가·평가금액·수익률 컬럼 추가 |

## 6. 핵심 로직

### 6-1. 심볼 변환 (`lib/quotes/symbol.ts`)
```ts
export function toYahooSymbols(ticker: string, market: Market): string[] {
  const t = ticker.trim().toUpperCase();
  switch (market) {
    case "KR":    return [`${t}.KS`, `${t}.KQ`];
    case "JP":    return [`${t}.T`];
    case "US":
    case "OTHER":
    default:      return [t];
  }
}
```

### 6-2. Yahoo 호출 (`lib/quotes/yahoo.ts`)
- 30초 타임아웃 (AbortController)
- User-Agent 필수 (Mozilla/5.0)
- 404 / "No data found" 시 `{ ok: false, reason: "not_found" }` 반환 (그래야 fallback 가능)
- 네트워크/JSON 에러는 별도 reason

### 6-3. 갱신 로직 (`lib/quotes/refresh.ts`)
1. 인증 + 계좌 소유권 확인 (anon client)
2. 해당 계좌의 holdings 전부 SELECT (anon client)
3. 각 holding마다:
   - `toYahooSymbols`로 후보 심볼 배열
   - 첫 번째 심볼로 `fetchYahooQuote` 호출 → 실패 + 후보 더 있으면 다음 심볼 시도
   - 성공 시 service role client로 `price_cache` UPSERT (ticker는 holdings.ticker 그대로 저장)
4. 실패한 종목 목록을 결과로 반환
5. revalidatePath('/accounts/[id]')

### 6-4. 화면 표시 (`app/accounts/[id]/page.tsx`)
- 기존 holdings SELECT를 `price_cache` LEFT JOIN으로 확장 (또는 별도 SELECT 후 합치기)
  - Supabase JS는 외래키가 있어야 임베드 가능 → `price_cache.ticker`는 FK 아님
  - → **별도 쿼리**: holdings 가져온 뒤, 그 ticker 목록으로 `price_cache.in("ticker", ...)` 가장 최신 date만
- 매핑해서 holdings 행에 currentPrice 붙임
- 표 컬럼 추가: `현재가 | 평가금액 | 수익률 | 갱신일`
- 시세 없는 행: "—" 표시 + "갱신 필요" 뱃지

### 6-5. 수익률 계산 (단순 — 통화 환산 X)
```
평가금액 = quantity × close_price
취득원가 = quantity × avg_cost_price
수익금   = 평가금액 − 취득원가
수익률   = (close_price / avg_cost_price − 1) × 100   // %
```
- close.currency != cost.currency 인 경우는 **수익률 계산 보류** ("통화 다름" 표시)
- 통화 일치 검증: `holding.cost_currency === priceCache.currency`

## 7. RLS·보안 메모

- `SUPABASE_SERVICE_ROLE_KEY`는 **절대 NEXT_PUBLIC_ 접두사 금지** — 서버에서만 사용
- `lib/supabase/admin.ts`는 `"server-only"` import로 클라이언트 번들 침투 방지
- service role 사용은 **price_cache/fx_rates UPSERT에만 한정** — 사용자 데이터(accounts/holdings/transactions)는 절대 admin client로 건드리지 않음

## 8. 에러 처리 / 사용자 피드백

| 상황 | 동작 |
|---|---|
| Yahoo 404 (모든 심볼 후보 실패) | 해당 종목만 실패 처리, 나머지는 계속 |
| 네트워크 timeout | 해당 종목 실패, 결과에 누적 |
| 전체 갱신 후 실패 1건+ | 토스트/알림에 "X종목 갱신 실패: AAPL, 005930" 표시 |
| 모두 성공 | "✓ N종목 갱신 완료 (HH:mm)" |
| Rate limit (429) | 5초 대기 후 1회 재시도, 그래도 실패면 종목 단위 실패 처리 |

## 9. 향후 확장 (Phase 2~)

- `price_cache.date` 기반 일자 추이 (차트)
- Vercel Cron Job: 매일 미국장 종가 후 자동 호출
- yfinance 사이드카 전환 (TODO A2 트리거 충족 시)
- fx_rates 도입 (한국은행 ECOS API + 양도소득세 거래일 환율)

## 10. 검증 게이트

- [x] Plan 작성
- [ ] tsc clean
- [ ] eslint clean
- [ ] build 성공
- [ ] 비인증 라우트 보호 확인 (refresh action도 auth 체크)
- [ ] 1종목 수동 갱신 후 평가금액/수익률 정상 표시
- [ ] 한국 종목 .KS fallback → .KQ 정상 작동 (예: 카카오게임즈 293490 = KOSDAQ)
- [ ] 갱신 실패 종목이 결과 메시지에 노출
