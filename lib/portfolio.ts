import type { Account, Holding } from "@prisma/client";
import { toNumber } from "@/lib/utils";

export type AccountWithHoldings = Account & {
  holdings: Holding[];
};

export type HoldingValue = Holding & {
  costBasisBase: number;
  marketValueBase: number;
  unrealizedGainBase: number;
};

export type AccountValue = Account & {
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

export function enrichHolding(holding: Holding): HoldingValue {
  const quantity = toNumber(holding.quantity);
  const averageCost = toNumber(holding.averageCost);
  const manualPrice = toNumber(holding.manualPrice);
  const manualFxRate = toNumber(holding.manualFxRate) || 1;
  const costBasisBase = quantity * averageCost * manualFxRate;
  const marketValueBase = quantity * manualPrice * manualFxRate;

  return {
    ...holding,
    costBasisBase,
    marketValueBase,
    unrealizedGainBase: marketValueBase - costBasisBase
  };
}

export function enrichAccount(account: AccountWithHoldings): AccountValue {
  const cashValueBase = toNumber(account.cashBalance);
  const holdings = account.holdings.map(enrichHolding);
  const holdingsValueBase = holdings.reduce(
    (total, holding) => total + holding.marketValueBase,
    0
  );
  const isLiability = account.type === "CREDIT" || account.type === "LOAN";
  const accountValue = cashValueBase + holdingsValueBase;

  return {
    ...account,
    holdings,
    cashValueBase,
    holdingsValueBase,
    liabilitiesBase: isLiability ? Math.abs(accountValue) : 0,
    totalValueBase: isLiability ? -Math.abs(accountValue) : accountValue
  };
}

export function summarizePortfolio(accounts: AccountWithHoldings[]): {
  accounts: AccountValue[];
  summary: PortfolioSummary;
} {
  const enrichedAccounts = accounts.map(enrichAccount);
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
