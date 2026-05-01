import type { AccountValue, HoldingValue } from "@/lib/portfolio";

// 한국 세법 상수
const FINANCIAL_INCOME_THRESHOLD = 20_000_000; // 금융소득종합과세 기준 2천만원
const FINANCIAL_INCOME_TAX_RATE = 0.154; // 원천징수 14% + 지방세 1.4%
const FOREIGN_GAIN_DEDUCTION = 2_500_000; // 해외주식 양도소득 기본공제 250만원
const FOREIGN_GAIN_TAX_RATE = 0.22; // 해외주식 양도세율 22% (지방소득세 포함)

export type DividendIncomeSummary = {
  /** 예상 연간 배당+이자 소득 합계 (KRW) */
  totalEstimated: number;
  /** 종합과세 기준 대비 비율 0~1+ */
  thresholdRatio: number;
  /** 종합과세 대상 여부 */
  isOverThreshold: boolean;
  /** 원천징수 예상 세금 */
  withholdingTax: number;
  /** 종합과세 추가 세금 (초과분 기준 보수적 추정) */
  additionalTax: number;
  /** 보유 종목별 배당 내역 */
  items: {
    name: string;
    symbol: string | null;
    accountName: string;
    marketValue: number;
    dividendYield: number;
    estimatedIncome: number;
  }[];
};

export type ForeignGainSummary = {
  /** 해외주식·크립토 미실현 양도차익 합계 (KRW) */
  totalUnrealizedGain: number;
  /** 기본공제 후 과세표준 */
  taxableGain: number;
  /** 예상 세금 */
  estimatedTax: number;
  /** 보유 종목별 내역 */
  items: {
    name: string;
    symbol: string | null;
    accountName: string;
    assetClass: string;
    unrealizedGain: number;
    unrealizedGainPct: number;
  }[];
};

export type TaxAdvantagedSummary = {
  accounts: {
    id: string;
    name: string;
    institution: string | null;
    totalValue: number;
    limit: number | null;
    used: number;
    remaining: number | null;
    usageRatio: number | null;
  }[];
};

const FOREIGN_ASSET_CLASSES = new Set(["INTERNATIONAL_STOCK", "CRYPTO"]);

export function calcDividendIncome(
  accounts: (AccountValue & { name: string })[]
): DividendIncomeSummary {
  const items: DividendIncomeSummary["items"] = [];

  for (const account of accounts) {
    for (const holding of account.holdings) {
      if (!holding.dividendYield || holding.dividendYield <= 0) continue;
      const estimatedIncome = holding.marketValueBase * (holding.dividendYield / 100);
      if (estimatedIncome <= 0) continue;
      items.push({
        name: holding.name,
        symbol: holding.symbol ?? null,
        accountName: account.name,
        marketValue: holding.marketValueBase,
        dividendYield: holding.dividendYield,
        estimatedIncome
      });
    }
  }

  items.sort((a, b) => b.estimatedIncome - a.estimatedIncome);

  const totalEstimated = items.reduce((s, i) => s + i.estimatedIncome, 0);
  const thresholdRatio = totalEstimated / FINANCIAL_INCOME_THRESHOLD;
  const isOverThreshold = totalEstimated >= FINANCIAL_INCOME_THRESHOLD;
  const withholdingTax = Math.min(totalEstimated, FINANCIAL_INCOME_THRESHOLD) * FINANCIAL_INCOME_TAX_RATE;
  // 종합과세 초과분: 단순히 초과액에 대해 최고세율(45%) 기준 보수적 추정
  const additionalTax = isOverThreshold
    ? (totalEstimated - FINANCIAL_INCOME_THRESHOLD) * 0.45
    : 0;

  return { totalEstimated, thresholdRatio, isOverThreshold, withholdingTax, additionalTax, items };
}

export function calcForeignGains(
  accounts: (AccountValue & { name: string })[]
): ForeignGainSummary {
  const items: ForeignGainSummary["items"] = [];

  for (const account of accounts) {
    for (const holding of account.holdings) {
      if (!FOREIGN_ASSET_CLASSES.has(holding.assetClass)) continue;
      if (holding.unrealizedGainBase <= 0) continue;
      const unrealizedGainPct =
        holding.costBasisBase > 0
          ? (holding.unrealizedGainBase / holding.costBasisBase) * 100
          : 0;
      items.push({
        name: holding.name,
        symbol: holding.symbol ?? null,
        accountName: account.name,
        assetClass: holding.assetClass,
        unrealizedGain: holding.unrealizedGainBase,
        unrealizedGainPct
      });
    }
  }

  items.sort((a, b) => b.unrealizedGain - a.unrealizedGain);

  const totalUnrealizedGain = items.reduce((s, i) => s + i.unrealizedGain, 0);
  const taxableGain = Math.max(0, totalUnrealizedGain - FOREIGN_GAIN_DEDUCTION);
  const estimatedTax = taxableGain * FOREIGN_GAIN_TAX_RATE;

  return { totalUnrealizedGain, taxableGain, estimatedTax, items };
}

export function calcTaxAdvantaged(
  accounts: (AccountValue & { name: string })[]
): TaxAdvantagedSummary {
  const result: TaxAdvantagedSummary["accounts"] = [];

  for (const account of accounts) {
    if (!account.isTaxAdvantaged) continue;
    const totalValue = account.totalValueBase;
    const limit = account.annualContributionLimit;
    const used = Math.max(0, account.contributionYTD);
    const remaining = limit != null ? Math.max(0, limit - used) : null;
    const usageRatio = limit != null && limit > 0 ? used / limit : null;

    result.push({
      id: account.id,
      name: account.name,
      institution: account.institution ?? null,
      totalValue,
      limit,
      used,
      remaining,
      usageRatio
    });
  }

  return { accounts: result };
}
