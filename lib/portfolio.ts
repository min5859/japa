import type { Account, Holding } from "@prisma/client";
import { toNumber } from "@/lib/utils";

export type AccountWithHoldings = Account & {
  holdings: Holding[];
};

export type HoldingValue = Omit<
  Holding,
  "quantity" | "averageCost" | "manualPrice" | "manualFxRate" | "dividendYield"
> & {
  quantity: number;
  averageCost: number;
  manualPrice: number;
  manualFxRate: number;
  dividendYield: number | null;
  costBasisBase: number;
  marketValueBase: number;
  unrealizedGainBase: number;
  usingLivePrice: boolean;
};

export type AccountValue = Omit<Account, "cashBalance" | "annualContributionLimit"> & {
  cashBalance: number;
  annualContributionLimit: number | null;
  holdings: HoldingValue[];
  cashValueBase: number;
  holdingsValueBase: number;
  liabilitiesBase: number;
  totalValueBase: number;
};

export type PortfolioSummary = {
  baseCurrency: "KRW";
  totalAssets: number;
  cash: number;
  investments: number;
  liabilities: number;
  netWorth: number;
  accountCount: number;
  holdingCount: number;
};

export type PriceContext = {
  /** symbol → live market price (in the holding's own currency) */
  prices: Map<string, number>;
  /** Currency code → KRW exchange rate */
  fxRates: Map<string, number>;
};

export function enrichHolding(holding: Holding, ctx?: PriceContext): HoldingValue {
  const quantity = toNumber(holding.quantity);
  const averageCost = toNumber(holding.averageCost);

  const livePrice = holding.symbol ? ctx?.prices.get(holding.symbol) : undefined;
  const liveFxRate = holding.currency !== "KRW" ? ctx?.fxRates.get(holding.currency) : undefined;

  const manualPrice = toNumber(holding.manualPrice);
  const manualFxRate = toNumber(holding.manualFxRate) || 1;

  const price = livePrice ?? manualPrice;
  const fxRate = holding.currency === "KRW" ? 1 : (liveFxRate ?? manualFxRate);
  const costFxRate = holding.currency === "KRW" ? 1 : (liveFxRate ?? manualFxRate);

  const costBasisBase = quantity * averageCost * costFxRate;
  const marketValueBase = quantity * price * fxRate;

  return {
    ...holding,
    quantity,
    averageCost,
    manualPrice,
    manualFxRate,
    dividendYield: holding.dividendYield != null ? toNumber(holding.dividendYield) : null,
    costBasisBase,
    marketValueBase,
    unrealizedGainBase: marketValueBase - costBasisBase,
    usingLivePrice: livePrice !== undefined
  };
}

export function enrichAccount(account: AccountWithHoldings, ctx?: PriceContext): AccountValue {
  const cashValueBase = toNumber(account.cashBalance);
  const holdings = account.holdings.map((h) => enrichHolding(h, ctx));
  const holdingsValueBase = holdings.reduce((total, h) => total + h.marketValueBase, 0);
  const isLiability = account.type === "CREDIT" || account.type === "LOAN";
  const accountValue = cashValueBase + holdingsValueBase;

  return {
    ...account,
    cashBalance: cashValueBase,
    annualContributionLimit:
      account.annualContributionLimit != null
        ? toNumber(account.annualContributionLimit)
        : null,
    holdings,
    cashValueBase,
    holdingsValueBase,
    liabilitiesBase: isLiability ? Math.abs(accountValue) : 0,
    totalValueBase: isLiability ? -Math.abs(accountValue) : accountValue
  };
}

export function summarizePortfolio(
  accounts: AccountWithHoldings[],
  ctx?: PriceContext
): {
  accounts: AccountValue[];
  summary: PortfolioSummary;
} {
  const enrichedAccounts = accounts.map((a) => enrichAccount(a, ctx));
  const cash = enrichedAccounts.reduce(
    (total, account) => total + (account.totalValueBase > 0 ? account.cashValueBase : 0),
    0
  );
  const investments = enrichedAccounts.reduce(
    (total, account) => total + Math.max(account.holdingsValueBase, 0),
    0
  );
  const liabilities = enrichedAccounts.reduce(
    (total, account) => total + account.liabilitiesBase,
    0
  );
  const totalAssets = cash + investments;
  const holdingCount = enrichedAccounts.reduce(
    (total, account) => total + account.holdings.length,
    0
  );

  return {
    accounts: enrichedAccounts,
    summary: {
      baseCurrency: "KRW",
      totalAssets,
      cash,
      investments,
      liabilities,
      netWorth: totalAssets - liabilities,
      accountCount: enrichedAccounts.length,
      holdingCount
    }
  };
}
