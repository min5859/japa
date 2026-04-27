"use server";

import { getPortfolio } from "@/lib/data";
import { analyzePortfolio, type AiAnalysisResult } from "@/lib/ai";
import { calcDividendIncome, calcForeignGains, calcTaxAdvantaged } from "@/lib/tax";

export async function runAiAnalysis(): Promise<AiAnalysisResult> {
  const { accounts, summary } = await getPortfolio();
  const dividend = calcDividendIncome(accounts);
  const foreignGain = calcForeignGains(accounts);
  const taxAdvantaged = calcTaxAdvantaged(accounts);
  return analyzePortfolio(accounts, summary, dividend, foreignGain, taxAdvantaged);
}
