import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AccountValue, PortfolioSummary } from "@/lib/portfolio";
import type { DividendIncomeSummary, ForeignGainSummary, TaxAdvantagedSummary } from "@/lib/tax";
import { formatCurrency, formatNumber } from "@/lib/utils";

const ASSET_CLASS_LABELS: Record<string, string> = {
  CASH: "현금",
  DOMESTIC_STOCK: "국내주식",
  INTERNATIONAL_STOCK: "해외주식",
  ETF: "ETF",
  BOND: "채권",
  FUND: "펀드",
  CRYPTO: "암호화폐",
  REAL_ESTATE: "부동산",
  LIABILITY: "부채",
  OTHER: "기타"
};

function buildPortfolioContext(
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

  // 자산 배분
  const allHoldings = accounts.flatMap((a) => a.holdings);
  const byClass: Record<string, number> = {};
  for (const h of allHoldings) {
    byClass[h.assetClass] = (byClass[h.assetClass] ?? 0) + h.marketValueBase;
  }
  if (Object.keys(byClass).length > 0) {
    lines.push("## 자산 배분");
    for (const [cls, val] of Object.entries(byClass).sort((a, b) => b[1] - a[1])) {
      const pct = summary.totalAssets > 0 ? (val / summary.totalAssets) * 100 : 0;
      lines.push(`- ${ASSET_CLASS_LABELS[cls] ?? cls}: ${formatCurrency(val)} (${formatNumber(pct, 1)}%)`);
    }
    lines.push("");
  }

  // 계좌별 현황
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

  // 세금 현황
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

export type AiAnalysisResult = {
  summary: string;
  allocations: string;
  taxAdvice: string;
  recommendations: string;
  risks: string;
};

export async function analyzePortfolio(
  accounts: AccountValue[],
  summary: PortfolioSummary,
  dividend: DividendIncomeSummary,
  foreignGain: ForeignGainSummary,
  taxAdvantaged: TaxAdvantagedSummary
): Promise<AiAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const context = buildPortfolioContext(accounts, summary, dividend, foreignGain, taxAdvantaged);

  const prompt = `당신은 한국 개인 재무 전문가입니다. 아래 포트폴리오 데이터를 분석하고 JSON으로 응답해 주세요.

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

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // JSON 파싱 — 코드블록 있을 경우 제거
  const jsonText = text.startsWith("{") ? text : text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "");

  try {
    return JSON.parse(jsonText) as AiAnalysisResult;
  } catch {
    // 파싱 실패 시 전체 텍스트를 summary에 담아 반환
    return {
      summary: text,
      allocations: "",
      taxAdvice: "",
      recommendations: "",
      risks: ""
    };
  }
}
