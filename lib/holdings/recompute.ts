// Plan Ref: §3 — 이동평균 재계산 (결정론적)
// 사용처: createTransaction / updateTransaction / deleteTransaction 후 호출

import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupaClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * (account_id, ticker)의 모든 거래를 처음부터 재집계해서
 * holdings 테이블의 quantity / avg_cost_price를 갱신한다.
 *
 * 매수: 평균단가 = (기존 qty × 기존 평단 + 신규 qty × 매수가) / 신규 합계
 * 매도: 수량만 차감, 평단 유지
 * 배당/이자/수수료: holdings 무영향 (transactions에만 기록)
 *
 * 결과적으로 quantity가 0이 되어도 row는 유지 (히스토리 보존).
 * 거래가 하나도 없으면 (ticker가 더 이상 거래에 없으면) holdings row 제거.
 */
export async function recomputeHolding(
  client: SupaClient,
  args: {
    userId: string;
    accountId: string;
    ticker: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, accountId, ticker } = args;

  // 1. 해당 (account, ticker)의 모든 거래 조회 — 매수/매도만 holdings에 영향
  // ticker는 transactions 테이블에 직접 컬럼이 없으므로 holdings 조인이 필요한데,
  // 우리는 거래 입력 시 ticker를 transactions에 저장하지 않고 holding_id로 연결한다.
  // 하지만 새 매수의 경우 holding_id가 아직 없을 수 있으므로,
  // 실제로는 매수/매도 거래 행에 ticker/market/name을 임시 저장하는 방법이 필요하다.
  //
  // 결정: transactions row에 holding_id가 있으면 거기서 ticker를 끌어오고,
  // holding_id가 null인 (새 매수) 경우는 다른 곳에서 처리.
  //
  // 더 단순한 접근: 호출 측에서 ticker를 받고, transactions를 holding_id로 JOIN해서 가져온다.
  // 하지만 새 매수의 첫 INSERT는 holding row가 아직 없으므로 holding_id가 null.
  //
  // → 해결: createTransaction 시점에 (1) holdings UPSERT 먼저 (2) holding_id로 transaction INSERT
  //   재계산은 holdings.id를 기준으로 transactions를 모은다.

  const { data: holding, error: holdingErr } = await client
    .from("holdings")
    .select("id, market, name, cost_currency")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("ticker", ticker)
    .maybeSingle();

  if (holdingErr) {
    return { ok: false, error: `holdings 조회 실패: ${holdingErr.message}` };
  }
  if (!holding) {
    // holding이 없으면 재계산할 것도 없음
    return { ok: true };
  }

  const { data: txs, error: txErr } = await client
    .from("transactions")
    .select("type, quantity, price, currency, trade_date, created_at")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("holding_id", holding.id)
    .order("trade_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (txErr) {
    return { ok: false, error: `transactions 조회 실패: ${txErr.message}` };
  }

  let quantity = 0;
  let avgCost = 0;

  type TxAggRow = {
    type: "buy" | "sell" | "dividend" | "interest" | "fee";
    quantity: number | null;
    price: number | null;
  };
  for (const tx of (txs ?? []) as TxAggRow[]) {
    if (tx.type === "buy") {
      const q = Number(tx.quantity ?? 0);
      const p = Number(tx.price ?? 0);
      if (q <= 0 || p <= 0) continue;
      const newQty = quantity + q;
      avgCost = (quantity * avgCost + q * p) / newQty;
      quantity = newQty;
    } else if (tx.type === "sell") {
      const q = Number(tx.quantity ?? 0);
      if (q <= 0) continue;
      quantity = quantity - q;
      // avgCost 유지
    }
    // dividend / interest / fee: holdings에 영향 없음
  }

  // 거래가 없거나 매수/매도가 0건이면 holdings row 제거
  const hasTrades = (txs ?? []).some((t) => t.type === "buy" || t.type === "sell");
  if (!hasTrades) {
    const { error: delErr } = await client
      .from("holdings")
      .delete()
      .eq("id", holding.id)
      .eq("user_id", userId);
    if (delErr) return { ok: false, error: `holdings 삭제 실패: ${delErr.message}` };
    return { ok: true };
  }

  const { error: updErr } = await client
    .from("holdings")
    .update({
      quantity: roundQty(quantity),
      avg_cost_price: roundPrice(avgCost),
    })
    .eq("id", holding.id)
    .eq("user_id", userId);

  if (updErr) {
    return { ok: false, error: `holdings 업데이트 실패: ${updErr.message}` };
  }

  return { ok: true };
}

/**
 * 신규 매수 거래에 대비해 holdings row를 미리 보장(UPSERT).
 * createTransaction에서 transactions INSERT 전에 호출.
 * 이미 있으면 그대로 두고, 없으면 quantity=0 / avg_cost=0으로 새로 만든다.
 */
export async function ensureHolding(
  client: SupaClient,
  args: {
    userId: string;
    accountId: string;
    ticker: string;
    market: string;
    name: string | null;
    costCurrency: string;
  },
): Promise<{ ok: true; holdingId: string } | { ok: false; error: string }> {
  const { userId, accountId, ticker, market, name, costCurrency } = args;

  const { data: existing, error: findErr } = await client
    .from("holdings")
    .select("id")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("ticker", ticker)
    .maybeSingle();

  if (findErr) return { ok: false, error: `holdings 조회 실패: ${findErr.message}` };
  if (existing) return { ok: true, holdingId: existing.id };

  const { data: inserted, error: insErr } = await client
    .from("holdings")
    .insert({
      user_id: userId,
      account_id: accountId,
      ticker,
      market,
      name,
      quantity: 0,
      avg_cost_price: 0,
      cost_currency: costCurrency,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return { ok: false, error: `holdings 생성 실패: ${insErr?.message ?? "unknown"}` };
  }
  return { ok: true, holdingId: inserted.id };
}

/**
 * 매도 시 보유 수량 검증.
 * 현재 holdings 수량보다 많이 팔려고 하면 막는다.
 * 편집·삭제 시에도 가상 시뮬레이션이 필요하므로 옵션으로 deltaQty(예상 차이)를 받는다.
 */
export async function checkSellQuantity(
  client: SupaClient,
  args: {
    userId: string;
    accountId: string;
    ticker: string;
    sellQty: number;
    excludeTxId?: string; // 편집 시 자기 자신을 제외
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, accountId, ticker, sellQty, excludeTxId } = args;

  const { data: holding } = await client
    .from("holdings")
    .select("id")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("ticker", ticker)
    .maybeSingle();

  if (!holding) {
    return { ok: false, error: "보유종목이 없습니다 — 매수 거래부터 입력해주세요" };
  }

  let txQuery = client
    .from("transactions")
    .select("type, quantity, id")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("holding_id", holding.id);

  if (excludeTxId) {
    txQuery = txQuery.neq("id", excludeTxId);
  }

  const { data: txs, error } = await txQuery;
  if (error) return { ok: false, error: `검증 실패: ${error.message}` };

  let owned = 0;
  for (const tx of txs ?? []) {
    const q = Number(tx.quantity ?? 0);
    if (tx.type === "buy") owned += q;
    else if (tx.type === "sell") owned -= q;
  }

  if (sellQty > owned + 1e-9) {
    return {
      ok: false,
      error: `보유 수량(${owned})을 초과하여 매도할 수 없습니다 (요청: ${sellQty})`,
    };
  }
  return { ok: true };
}

// 부동소수점 정리 (DB numeric(20,4))
function roundQty(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
function roundPrice(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
