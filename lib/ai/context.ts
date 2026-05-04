import type { AccountValue, PortfolioSummary } from "@/lib/portfolio";
import { groupHoldingsByAssetClass } from "@/lib/portfolio";
import type { DividendIncomeSummary, ForeignGainSummary, TaxAdvantagedSummary } from "@/lib/tax";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ASSET_CLASS_LABELS } from "@/lib/holdings/schema";

export function buildPortfolioContext(
  accounts: AccountValue[],
  summary: PortfolioSummary,
  dividend: DividendIncomeSummary,
  foreignGain: ForeignGainSummary,
  taxAdvantaged: TaxAdvantagedSummary
): string {
  const lines: string[] = [];

  lines.push("## 포트폴리오 현황");
  lines.push(`- 순자산: ${formatCurrency(summary.netWorth)}`);
  lines.push(`- 총자산: ${formatCurrency(summary.totalAssets)}`);
  lines.push(`- 현금: ${formatCurrency(summary.cash)}`);
  lines.push(`- 투자자산: ${formatCurrency(summary.investments)}`);
  lines.push(`- 부채: ${formatCurrency(summary.liabilities)}`);
  lines.push(`- 계좌 수: ${summary.accountCount}개, 보유 자산: ${summary.holdingCount}종`);
  lines.push("");

  const byClass = groupHoldingsByAssetClass(accounts);
  if (Object.keys(byClass).length > 0) {
    lines.push("## 자산 배분");
    for (const [cls, val] of Object.entries(byClass).sort((a, b) => b[1] - a[1])) {
      const pct = summary.totalAssets > 0 ? (val / summary.totalAssets) * 100 : 0;
      lines.push(`- ${ASSET_CLASS_LABELS[cls] ?? cls}: ${formatCurrency(val)} (${formatNumber(pct, 1)}%)`);
    }
    lines.push("");
  }

  lines.push("## 계좌별 현황");
  for (const acc of accounts) {
    lines.push(`### ${acc.name} (${acc.institution ?? "-"})`);
    lines.push(`- 평가액: ${formatCurrency(acc.totalValueBase)}`);
    if (acc.holdings.length > 0) {
      for (const h of acc.holdings.slice(0, 5)) {
        const gain = h.unrealizedGainBase;
        const gainStr = gain >= 0 ? `+${formatCurrency(gain)}` : formatCurrency(gain);
        lines.push(`  - ${h.name}${h.symbol ? ` (${h.symbol})` : ""}: ${formatCurrency(h.marketValueBase)} 미실현 ${gainStr}`);
      }
      if (acc.holdings.length > 5) {
        lines.push(`  - ... 외 ${acc.holdings.length - 5}종`);
      }
    }
  }
  lines.push("");

  lines.push("## 세금 현황");
  lines.push(`- 예상 연간 금융소득: ${formatCurrency(dividend.totalEstimated)}`);
  lines.push(`- 금융소득종합과세 기준 달성률: ${formatNumber(dividend.thresholdRatio * 100, 1)}%`);
  if (dividend.isOverThreshold) {
    lines.push("- ⚠️ 금융소득종합과세 대상 (2천만원 초과)");
  }
  lines.push(`- 해외주식·크립토 미실현 양도차익: ${formatCurrency(foreignGain.totalUnrealizedGain)}`);
  lines.push(`- 예상 양도소득세: ${formatCurrency(foreignGain.estimatedTax)}`);
  if (taxAdvantaged.accounts.length > 0) {
    lines.push("- 세테크 계좌:");
    for (const acc of taxAdvantaged.accounts) {
      const remainStr = acc.remaining != null ? ` (잔여 ${formatCurrency(acc.remaining)})` : "";
      lines.push(`  - ${acc.name}: ${formatCurrency(acc.used)}${remainStr}`);
    }
  }

  return lines.join("\n");
}

export const CHAT_SYSTEM_PROMPT = (context: string) => `당신은 한국 개인 재무 상담 전문가입니다. 아래는 사용자의 현재 재무 데이터입니다. 이 데이터를 근거로 한국어로 정확하고 친절하게 답변하세요. 일반적 조언이 아니라 사용자 본인의 데이터를 인용하며 답하세요. 불확실한 부분은 추측하지 말고 명시하세요.

${context}

— 데이터 끝 —`;

export const ANALYSIS_PROMPT_TEMPLATE = (context: string) => `당신은 한국 개인 재무 전문가입니다. 아래 포트폴리오 데이터를 분석하고 JSON으로 응답해 주세요.

${context}

다음 항목을 각각 3~5문장으로 분석하여 JSON 형식으로 반환하세요. 모든 내용은 한국어로 작성하세요.

{
  "summary": "전체 포트폴리오 요약 및 재무 건전성 평가",
  "allocations": "자산 배분 분석 — 현재 배분의 장단점, 균형 여부",
  "taxAdvice": "세금 최적화 조언 — 금융소득종합과세, 양도소득세, 세테크 계좌 활용",
  "recommendations": "구체적인 투자 개선 제안 3가지",
  "risks": "주요 리스크 및 주의사항"
}

JSON만 반환하고 마크다운 코드블록 없이 순수 JSON으로 응답하세요.`;
