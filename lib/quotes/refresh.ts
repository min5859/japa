// Plan Ref: yahoo-quotes §6-3
// 계좌 단위 시세 갱신. Server Action.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import type { Holding } from "@/lib/transactions/schema";
import { toYahooSymbols } from "./symbol";
import { fetchYahooQuote } from "./yahoo";

export type RefreshResult =
  | { ok: true; updated: number; failed: Array<{ ticker: string; reason: string }>; at: string }
  | { ok: false; error: string };

export async function refreshQuotesForAccount(
  accountId: string,
): Promise<RefreshResult> {
  // 1. 인증 + allowlist
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return { ok: false, error: "인증이 필요합니다" };
  }

  // 2. 계좌 소유권 확인 (RLS가 한 번 더 차단하지만 명시적으로)
  const { data: account, error: accountErr } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (accountErr || !account) {
    return { ok: false, error: "계좌를 찾을 수 없습니다" };
  }

  // 3. 보유종목 조회
  const { data: holdingsData, error: holdingsErr } = await supabase
    .from("holdings")
    .select("ticker, market")
    .eq("user_id", user.id)
    .eq("account_id", accountId);
  if (holdingsErr) {
    return { ok: false, error: `보유종목 조회 실패: ${holdingsErr.message}` };
  }
  const holdings = (holdingsData ?? []) as Pick<Holding, "ticker" | "market">[];
  if (holdings.length === 0) {
    return { ok: true, updated: 0, failed: [], at: new Date().toISOString() };
  }

  // 4. 각 종목에 대해 Yahoo 호출 → price_cache UPSERT
  const admin = createSupabaseAdminClient();
  const failed: Array<{ ticker: string; reason: string }> = [];
  let updated = 0;
  const INTER_TICKER_DELAY_MS = 200; // burst 차단 회피

  for (let i = 0; i < holdings.length; i += 1) {
    const h = holdings[i];
    if (i > 0) {
      await new Promise<void>((res) =>
        setTimeout(res, INTER_TICKER_DELAY_MS),
      );
    }
    const candidates = toYahooSymbols(h.ticker, h.market);
    if (candidates.length === 0) {
      failed.push({ ticker: h.ticker, reason: "심볼 변환 실패" });
      continue;
    }

    let success = false;
    let lastReason = "";
    for (const sym of candidates) {
      const r = await fetchYahooQuote(sym);
      if (r.ok) {
        const dateStr = r.quote.asOf.toISOString().slice(0, 10); // YYYY-MM-DD
        const { error: upErr } = await admin
          .from("price_cache")
          .upsert(
            {
              ticker: h.ticker, // holdings 기준 ticker (변환 전)
              date: dateStr,
              close_price: r.quote.close,
              currency: r.quote.currency,
              source: "yahoo",
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "ticker,date" },
          );
        if (upErr) {
          lastReason = `cache upsert 실패: ${upErr.message}`;
          continue; // 다음 심볼 후보 (사실상 의미 없지만 안전망)
        }
        updated += 1;
        success = true;
        break;
      } else {
        lastReason = `${r.reason}${r.detail ? ` (${r.detail})` : ""}`;
        // not_found 인 경우만 다음 심볼 후보로 진행, 그 외는 즉시 실패
        if (r.reason !== "not_found") break;
      }
    }
    if (!success) {
      failed.push({ ticker: h.ticker, reason: lastReason || "알 수 없음" });
    }
  }

  revalidatePath(`/accounts/${accountId}`);
  return {
    ok: true,
    updated,
    failed,
    at: new Date().toISOString(),
  };
}
