// Plan Ref: §4 — Server Actions for transactions
// 모든 mutation에 .eq('user_id', auth.userId) 명시 (RLS + 코드 이중 방어)

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  transactionFormSchema,
  type TransactionFormInput,
} from "@/lib/transactions/schema";
import {
  ensureHolding,
  recomputeHolding,
  checkSellQuantity,
} from "@/lib/holdings/recompute";

type ActionResult = { ok: true } | { ok: false; error: string };

async function getAuthed() {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };
  return { ok: true as const, userId: user.id, client };
}

async function assertOwnsAccount(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  accountId: string,
): Promise<boolean> {
  const { data } = await client
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

// ----------------------------------------------------------------------------

export async function createTransaction(
  accountId: string,
  input: TransactionFormInput,
): Promise<ActionResult> {
  const parsed = transactionFormSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid input" };
  }

  const auth = await getAuthed();
  if (!auth.ok) return auth;

  const owns = await assertOwnsAccount(auth.client, auth.userId, accountId);
  if (!owns) return { ok: false, error: "계좌를 찾을 수 없습니다" };

  const data = parsed.data;
  const isTrade = data.type === "buy" || data.type === "sell";

  let holdingId: string | null = null;

  if (isTrade) {
    const ticker = (data.ticker ?? "").trim();
    const market = data.market!;

    if (data.type === "sell") {
      const check = await checkSellQuantity(auth.client, {
        userId: auth.userId,
        accountId,
        ticker,
        sellQty: Number(data.quantity ?? 0),
      });
      if (!check.ok) return check;
    }

    const ensured = await ensureHolding(auth.client, {
      userId: auth.userId,
      accountId,
      ticker,
      market,
      name: data.name && data.name.length > 0 ? data.name : null,
      costCurrency: data.currency,
    });
    if (!ensured.ok) return ensured;
    holdingId = ensured.holdingId;
  }

  const { error: insErr } = await auth.client.from("transactions").insert({
    user_id: auth.userId,
    account_id: accountId,
    holding_id: holdingId,
    type: data.type,
    quantity: isTrade ? data.quantity : null,
    price: isTrade ? data.price : null,
    amount: data.amount,
    fee: data.fee,
    tax_withheld: data.tax_withheld,
    currency: data.currency,
    trade_date: data.trade_date,
    memo: data.memo && data.memo.length > 0 ? data.memo : null,
  });

  if (insErr) {
    console.error("[transactions/create] insert failed:", insErr.message);
    return { ok: false, error: "거래 생성에 실패했습니다." };
  }

  if (isTrade) {
    const ticker = (data.ticker ?? "").trim();
    const recompute = await recomputeHolding(auth.client, {
      userId: auth.userId,
      accountId,
      ticker,
    });
    if (!recompute.ok) {
      console.error("[transactions/create] recompute failed:", recompute.error);
      // INSERT는 성공했으므로 사용자에겐 부분 성공 안내
      return { ok: false, error: `거래는 저장되었으나 재계산 실패: ${recompute.error}` };
    }
  }

  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  redirect(`/accounts/${accountId}`);
}

// ----------------------------------------------------------------------------

export async function updateTransaction(
  accountId: string,
  txId: string,
  input: TransactionFormInput,
): Promise<ActionResult> {
  if (!txId) return { ok: false, error: "Missing tx id" };

  const parsed = transactionFormSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid input" };
  }

  const auth = await getAuthed();
  if (!auth.ok) return auth;

  const owns = await assertOwnsAccount(auth.client, auth.userId, accountId);
  if (!owns) return { ok: false, error: "계좌를 찾을 수 없습니다" };

  // 기존 거래 조회 (이전 ticker 추적용)
  const { data: prev, error: prevErr } = await auth.client
    .from("transactions")
    .select("id, type, holding_id, account_id")
    .eq("id", txId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (prevErr || !prev) return { ok: false, error: "거래를 찾을 수 없습니다" };
  if (prev.account_id !== accountId) return { ok: false, error: "계좌 불일치" };

  // 이전 holding의 ticker 알아내기 (재계산 트리거용)
  let prevTicker: string | null = null;
  if (prev.holding_id) {
    const { data: prevHolding } = await auth.client
      .from("holdings")
      .select("ticker")
      .eq("id", prev.holding_id)
      .maybeSingle();
    prevTicker = prevHolding?.ticker ?? null;
  }

  const data = parsed.data;
  const isTrade = data.type === "buy" || data.type === "sell";
  let newHoldingId: string | null = null;

  if (isTrade) {
    const ticker = (data.ticker ?? "").trim();
    const market = data.market!;

    if (data.type === "sell") {
      const check = await checkSellQuantity(auth.client, {
        userId: auth.userId,
        accountId,
        ticker,
        sellQty: Number(data.quantity ?? 0),
        excludeTxId: txId,
      });
      if (!check.ok) return check;
    }

    const ensured = await ensureHolding(auth.client, {
      userId: auth.userId,
      accountId,
      ticker,
      market,
      name: data.name && data.name.length > 0 ? data.name : null,
      costCurrency: data.currency,
    });
    if (!ensured.ok) return ensured;
    newHoldingId = ensured.holdingId;
  }

  const { error: updErr } = await auth.client
    .from("transactions")
    .update({
      holding_id: newHoldingId,
      type: data.type,
      quantity: isTrade ? data.quantity : null,
      price: isTrade ? data.price : null,
      amount: data.amount,
      fee: data.fee,
      tax_withheld: data.tax_withheld,
      currency: data.currency,
      trade_date: data.trade_date,
      memo: data.memo && data.memo.length > 0 ? data.memo : null,
    })
    .eq("id", txId)
    .eq("user_id", auth.userId);

  if (updErr) {
    console.error("[transactions/update] update failed:", updErr.message);
    return { ok: false, error: "거래 수정에 실패했습니다." };
  }

  // 영향 받은 모든 ticker 재계산 (이전 + 새 ticker, 다를 수 있음)
  const tickersToRecompute = new Set<string>();
  if (prevTicker) tickersToRecompute.add(prevTicker);
  if (isTrade && data.ticker) tickersToRecompute.add(data.ticker.trim());

  for (const t of tickersToRecompute) {
    const r = await recomputeHolding(auth.client, {
      userId: auth.userId,
      accountId,
      ticker: t,
    });
    if (!r.ok) console.error(`[transactions/update] recompute(${t}) failed:`, r.error);
  }

  revalidatePath(`/accounts/${accountId}`);
  revalidatePath(`/accounts/${accountId}/transactions/${txId}/edit`);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  redirect(`/accounts/${accountId}`);
}

// ----------------------------------------------------------------------------

export async function deleteTransaction(
  accountId: string,
  txId: string,
): Promise<ActionResult> {
  if (!txId) return { ok: false, error: "Missing tx id" };

  const auth = await getAuthed();
  if (!auth.ok) return auth;

  // 영향 받을 ticker 미리 조회
  const { data: tx } = await auth.client
    .from("transactions")
    .select("holding_id, account_id")
    .eq("id", txId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!tx) return { ok: false, error: "거래를 찾을 수 없습니다" };
  if (tx.account_id !== accountId) return { ok: false, error: "계좌 불일치" };

  let ticker: string | null = null;
  if (tx.holding_id) {
    const { data: h } = await auth.client
      .from("holdings")
      .select("ticker")
      .eq("id", tx.holding_id)
      .maybeSingle();
    ticker = h?.ticker ?? null;
  }

  const { error: delErr } = await auth.client
    .from("transactions")
    .delete()
    .eq("id", txId)
    .eq("user_id", auth.userId);

  if (delErr) {
    console.error("[transactions/delete] delete failed:", delErr.message);
    return { ok: false, error: "거래 삭제에 실패했습니다." };
  }

  if (ticker) {
    const r = await recomputeHolding(auth.client, {
      userId: auth.userId,
      accountId,
      ticker,
    });
    if (!r.ok) console.error("[transactions/delete] recompute failed:", r.error);
  }

  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}
