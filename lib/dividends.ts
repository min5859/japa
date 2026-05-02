import type { AccountType, Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

/**
 * True if the account is one whose dividend payouts are not subject to
 * 원천징수 / 종합과세 (ISA, 연금저축, IRP). The flag and the enum can each
 * mark this independently, so check both.
 */
export function isTaxShelterAccount(
  accountType: AccountType,
  isTaxAdvantaged: boolean
): boolean {
  return (
    isTaxAdvantaged ||
    accountType === "TAX_ADVANTAGED" ||
    accountType === "RETIREMENT"
  );
}

/**
 * Default Korean withholding tax rate for a dividend payout. Users can
 * override on a per-payout basis (Dividend.isTaxOverridden).
 *
 * - Tax-shelter account → 0% (ISA, 연금저축, IRP)
 * - KRW (domestic) → 15.4% (소득세 14% + 지방세 1.4%)
 * - Foreign currency → 15% (US treaty rate, applied uniformly)
 */
export function defaultDividendTaxRate(
  accountType: AccountType,
  isTaxAdvantaged: boolean,
  currency: Currency
): number {
  if (isTaxShelterAccount(accountType, isTaxAdvantaged)) return 0;
  if (currency === "KRW") return 0.154;
  return 0.15;
}

export type ReceivedDividendTotals = {
  /** 세전 합계 (KRW 환산) */
  gross: number;
  /** 원천징수 합계 (KRW 환산) */
  tax: number;
  /** 실수령 합계 (KRW 환산) */
  net: number;
  /** 건수 */
  count: number;
};

/**
 * Sum dividends actually received in `year`, converted to KRW via the per-payout
 * fxRate. By default excludes payouts into tax-shelter accounts (ISA/연금/IRP)
 * since those don't count toward 금융소득종합과세 thresholds.
 */
export async function getReceivedDividendTotals(
  year: number,
  options: { includeTaxAdvantaged?: boolean } = {}
): Promise<ReceivedDividendTotals> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const rows = await prisma.dividend.findMany({
    where: { dividendDate: { gte: start, lt: end } },
    select: {
      totalAmount: true,
      taxAmount: true,
      fxRate: true,
      account: { select: { isTaxAdvantaged: true, type: true } }
    }
  });

  const totals: ReceivedDividendTotals = { gross: 0, tax: 0, net: 0, count: 0 };
  for (const r of rows) {
    if (
      !options.includeTaxAdvantaged &&
      isTaxShelterAccount(r.account.type, r.account.isTaxAdvantaged)
    )
      continue;
    const fx = toNumber(r.fxRate) || 1;
    const grossKrw = toNumber(r.totalAmount) * fx;
    const taxKrw = toNumber(r.taxAmount) * fx;
    totals.gross += grossKrw;
    totals.tax += taxKrw;
    totals.net += grossKrw - taxKrw;
    totals.count += 1;
  }
  return totals;
}
