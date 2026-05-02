import type { AccountType, Currency } from "@prisma/client";

/**
 * Default Korean withholding tax rate for a dividend payout based on the
 * receiving account's tax-shelter status and the payout currency. Users can
 * override on a per-payout basis (Dividend.isTaxOverridden).
 *
 * - TAX_ADVANTAGED / RETIREMENT account → 0% (ISA, 연금저축, IRP)
 * - KRW (domestic) → 15.4% (소득세 14% + 지방세 1.4%)
 * - Foreign currency → 15% (US treaty rate, applied uniformly)
 */
export function defaultDividendTaxRate(
  accountType: AccountType,
  isTaxAdvantaged: boolean,
  currency: Currency
): number {
  if (isTaxAdvantaged) return 0;
  if (accountType === "RETIREMENT" || accountType === "TAX_ADVANTAGED") return 0;
  if (currency === "KRW") return 0.154;
  return 0.15;
}
