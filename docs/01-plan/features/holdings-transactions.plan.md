# Plan — Step 5: 보유종목 + 거래내역 (holdings & transactions)

> **Phase 1 / Step 5** — 거래내역 입력으로 보유종목 자동 집계.
> 목표: 매수·매도 거래를 입력하면 평균단가·수량이 자동 재계산되어 계좌별 포트폴리오를 볼 수 있다.

---

## 1. Scope

### In-Scope (이번 Step)
- 거래내역(transactions) **입력 UI** — 매수/매도/배당/이자/수수료 5종 type
- 보유종목(holdings) **자동 집계** — 거래 변경 시 (계좌·티커) 단위로 재계산
- 계좌 상세 페이지(`/accounts/[id]`) — 보유종목 목록 + 거래내역 목록
- 거래 편집·삭제 (재계산 트리거 포함)

### Out-of-Scope (다음 Step 또는 Phase 2)
- 시세 조회·평가금액 계산 → Step 6 (Yahoo Finance)
- FIFO 양도차익 계산 → Phase 2 세금 엔진
- 환율 환산 → Phase 2
- 단위 테스트 자동화 → 이번 Step에서는 수동 검증, Phase 2 진입 전 도입

---

## 2. Data Model 매핑

### transactions (이미 존재)
```
id, user_id, account_id, holding_id (nullable),
type: 'buy' | 'sell' | 'dividend' | 'interest' | 'fee',
quantity, price, amount, fee, tax_withheld, currency,
trade_date, memo, created_at, updated_at
```

### holdings (이미 존재 — 이번 Step에서 자동 관리)
```
id, user_id, account_id, ticker, market, name,
quantity, avg_cost_price, cost_currency,
UNIQUE(account_id, ticker)
```

**핵심 결정**: holdings는 직접 CRUD하지 않는다.  거래 변경 시 서버 측에서 자동으로 UPSERT/DELETE.

---

## 3. 평균단가(이동평균) 알고리즘

거래 변경 후 (account_id, ticker)의 모든 거래를 `trade_date ASC, created_at ASC` 순으로 읽어 처음부터 누적:

```
quantity = 0
avg_cost = 0
for tx in transactions order by date:
  if tx.type == 'buy':
    new_qty = quantity + tx.quantity
    avg_cost = (quantity * avg_cost + tx.quantity * tx.price) / new_qty
    quantity = new_qty
  elif tx.type == 'sell':
    quantity = quantity - tx.quantity        # avg_cost 유지
  # dividend / interest / fee → holdings 무영향
```

규칙:
- 매도 후 `quantity == 0` → holdings row 유지 (히스토리 보존), 평단도 그대로 유지
- 매도가 보유수량보다 큰 경우 → 검증 에러 반환 (트랜잭션 롤백 X, 단순 차단)
- 거래 삭제·수정 후에도 같은 함수로 전체 재계산 → **결정론적**

---

## 4. Server Actions (`app/transactions/actions.ts` 또는 `app/accounts/[id]/transactions/actions.ts`)

| Action | 입력 | 부수효과 |
|---|---|---|
| `createTransaction` | account_id, type, ticker (buy/sell만), quantity, price, amount, fee, tax_withheld, currency, trade_date, memo | INSERT tx + recompute holding |
| `updateTransaction` | tx id + same fields | UPDATE tx + recompute holding (티커 바뀐 경우 양쪽 재계산) |
| `deleteTransaction` | tx id | DELETE tx + recompute holding |

검증(zod):
- buy/sell: ticker, quantity > 0, price > 0, amount = quantity × price + fee (참고용)
- dividend/interest: amount > 0
- fee: amount > 0
- trade_date ≤ today

---

## 5. Routes / UI

| 경로 | 종류 | 내용 |
|---|---|---|
| `/accounts/[id]` | Server Component | 계좌 헤더 + 보유종목 표 + 최근 거래 표 + "거래 추가" 버튼 |
| `/accounts/[id]/transactions/new` | Server Component | 거래 입력 폼 (type 선택 → 동적 필드) |
| `/accounts/[id]/transactions/[txId]/edit` | Server Component | 거래 편집 |

기존 `/accounts` 목록 행에 "상세" 버튼 추가 (편집·삭제 옆).

---

## 6. Success Criteria

- [ ] 거래 추가 시 holdings 자동 갱신
- [ ] 거래 편집 시 holdings 재계산
- [ ] 거래 삭제 시 holdings 재계산
- [ ] 매도가 보유수량 초과 시 차단
- [ ] 계좌 상세 페이지에 보유종목·거래내역 표시
- [ ] tsc / lint / build 통과
- [ ] 비인증 접근 차단 (proxy.ts 미들웨어)

---

## 7. 보안

- 모든 query/mutation에 `.eq('user_id', auth.userId)` 명시 (RLS + 코드 이중 방어)
- 거래의 account_id는 본인 계좌인지 RLS로 자동 검증됨
- holdings UPSERT 시에도 user_id 명시
