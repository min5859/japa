"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getPortfolio } from "@/lib/data";
import { analyzePortfolio } from "@/lib/ai";
import {
  PROVIDERS,
  PROVIDER_LABELS,
  type AiAnalysisResult,
  type AiProvider,
} from "@/lib/ai/types";
import { getAvailableProviders } from "@/lib/ai";
import { calcDividendIncome, calcForeignGains, calcTaxAdvantaged } from "@/lib/tax";

export type AiAnalysisRecord = {
  id: string;
  createdAt: Date;
  provider: string;
  model: string;
  netWorthAtTime: number | null;
} & AiAnalysisResult;

export async function runAiAnalysis(provider: AiProvider): Promise<AiAnalysisRecord> {
  if (!PROVIDERS.includes(provider)) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  const { accounts, summary } = await getPortfolio();
  const dividend = calcDividendIncome(accounts);
  const foreignGain = calcForeignGains(accounts);
  const taxAdvantaged = calcTaxAdvantaged(accounts);
  const { result, model } = await analyzePortfolio(
    provider,
    accounts,
    summary,
    dividend,
    foreignGain,
    taxAdvantaged
  );

  const saved = await prisma.aiAnalysis.create({
    data: {
      provider,
      model,
      summary: result.summary,
      allocations: result.allocations,
      taxAdvice: result.taxAdvice,
      recommendations: result.recommendations,
      risks: result.risks,
      netWorthAtTime: summary.netWorth,
    },
  });

  revalidatePath("/ai");
  return {
    id: saved.id,
    createdAt: saved.createdAt,
    provider: saved.provider,
    model: saved.model,
    summary: saved.summary,
    allocations: saved.allocations,
    taxAdvice: saved.taxAdvice,
    recommendations: saved.recommendations,
    risks: saved.risks,
    netWorthAtTime: saved.netWorthAtTime ? Number(saved.netWorthAtTime) : null,
  };
}

export async function deleteAnalysis(id: string): Promise<void> {
  await prisma.aiAnalysis.delete({ where: { id } });
  revalidatePath("/ai");
}

export async function getAvailableProviderList(): Promise<
  { value: AiProvider; label: string }[]
> {
  return getAvailableProviders().map((p) => ({ value: p, label: PROVIDER_LABELS[p] }));
}
