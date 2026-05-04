import type { AccountValue, PortfolioSummary } from "@/lib/portfolio";
import type { DividendIncomeSummary, ForeignGainSummary, TaxAdvantagedSummary } from "@/lib/tax";
import { ANALYSIS_PROMPT_TEMPLATE, buildPortfolioContext } from "@/lib/ai/context";
import {
  EMPTY_ANALYSIS,
  PROVIDERS,
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_ENV_KEYS,
  PROVIDER_MODEL_ENV_KEYS,
  type AiAdapter,
  type AiAnalysisResult,
  type AiProvider,
  type ChatAdapter,
  type ChatMessage,
} from "@/lib/ai/types";
import { callAnthropic, chatAnthropic } from "@/lib/ai/providers/anthropic";
import { callDeepSeek, chatDeepSeek } from "@/lib/ai/providers/deepseek";
import { callGemini, chatGemini } from "@/lib/ai/providers/gemini";
import { callOpenAi, chatOpenAi } from "@/lib/ai/providers/openai";

export type { AiAnalysisResult, AiProvider, ChatMessage } from "@/lib/ai/types";
export { PROVIDERS, PROVIDER_LABELS } from "@/lib/ai/types";

const ADAPTERS: Record<AiProvider, AiAdapter> = {
  gemini: callGemini,
  openai: callOpenAi,
  anthropic: callAnthropic,
  deepseek: callDeepSeek,
};

const CHAT_ADAPTERS: Record<AiProvider, ChatAdapter> = {
  gemini: chatGemini,
  openai: chatOpenAi,
  anthropic: chatAnthropic,
  deepseek: chatDeepSeek,
};

export function getAvailableProviders(): AiProvider[] {
  return PROVIDERS.filter((p) => Boolean(process.env[PROVIDER_ENV_KEYS[p]]));
}

export function resolveModel(provider: AiProvider): string {
  return process.env[PROVIDER_MODEL_ENV_KEYS[provider]] ?? PROVIDER_DEFAULT_MODELS[provider];
}

function parseJsonResult(text: string): AiAnalysisResult {
  // 코드블록 감싸진 경우 제거
  const jsonText = text.startsWith("{")
    ? text
    : text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "");

  try {
    const parsed = JSON.parse(jsonText) as Partial<AiAnalysisResult>;
    return { ...EMPTY_ANALYSIS, ...parsed };
  } catch {
    return { ...EMPTY_ANALYSIS, summary: text };
  }
}

export async function chat(
  provider: AiProvider,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<{ reply: string; model: string }> {
  const adapter = CHAT_ADAPTERS[provider];
  const model = resolveModel(provider);
  const reply = await adapter(systemPrompt, messages, model);
  return { reply, model };
}

export async function analyzePortfolio(
  provider: AiProvider,
  accounts: AccountValue[],
  summary: PortfolioSummary,
  dividend: DividendIncomeSummary,
  foreignGain: ForeignGainSummary,
  taxAdvantaged: TaxAdvantagedSummary
): Promise<{ result: AiAnalysisResult; model: string }> {
  const adapter = ADAPTERS[provider];
  const model = resolveModel(provider);
  const context = buildPortfolioContext(accounts, summary, dividend, foreignGain, taxAdvantaged);
  const prompt = ANALYSIS_PROMPT_TEMPLATE(context);

  const text = await adapter(prompt, model);
  return { result: parseJsonResult(text), model };
}
