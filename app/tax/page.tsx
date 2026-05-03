import { AlertTriangle, CheckCircle, Coins, Info, TrendingUp } from "lucide-react";
import { getPortfolio } from "@/lib/data";
import { calcDividendIncome, calcForeignGains, calcTaxAdvantaged } from "@/lib/tax";
import { getReceivedDividendTotals } from "@/lib/dividends";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ASSET_CLASS_LABELS } from "@/lib/holdings/schema";

function ProgressBar({ ratio, warn }: { ratio: number; warn: boolean }) {
  const pct = Math.min(ratio * 100, 100);
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={`h-full rounded-full transition-all ${warn ? "bg-red-500" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default async function TaxPage() {
  const currentYear = new Date().getUTCFullYear();
  const [{ accounts }, receivedYTD] = await Promise.all([
    getPortfolio(),
    getReceivedDividendTotals(currentYear)
  ]);
  const namedAccounts = accounts as (typeof accounts)[number][];

  const dividendSummary = calcDividendIncome(namedAccounts);
  const foreignGainSummary = calcForeignGains(namedAccounts);
  const taxAdvantagedSummary = calcTaxAdvantaged(namedAccounts);

  const THRESHOLD = 20_000_000;
  const DEDUCTION = 2_500_000;
  const ytdRatio = receivedYTD.gross / THRESHOLD;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">세금 관리</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          예상 금융소득·양도소득 세금을 한눈에 확인하세요. 수치는 현재 보유 기준 추정값입니다.
        </p>
      </div>

      {/* 금융소득종합과세 */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" />
          금융소득종합과세
        </h3>

        {/* 실수령 (올해 YTD, 절세계좌 제외) */}
        <Card className={ytdRatio >= 1 ? "border-red-500/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Coins className="h-4 w-4" />
              {currentYear}년 실수령 배당 ({receivedYTD.count}건, 절세계좌 제외)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">세전 합계 (KRW)</p>
              <p className="text-2xl font-bold">{formatCurrency(receivedYTD.gross)}</p>
              <ProgressBar ratio={ytdRatio} warn={ytdRatio >= 1} />
              <p className="mt-1 text-xs text-muted-foreground">
                기준 {formatCurrency(THRESHOLD)} 대비{" "}
                <span className={ytdRatio >= 1 ? "font-semibold text-red-500" : ""}>
                  {formatNumber(ytdRatio * 100, 1)}%
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">원천징수</p>
              <p className="text-2xl font-bold">{formatCurrency(receivedYTD.tax)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">실수령</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(receivedYTD.net)}</p>
            </div>
          </CardContent>
        </Card>

        <h4 className="text-sm font-medium text-muted-foreground">예상 (보유 기준)</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className={dividendSummary.isOverThreshold ? "border-red-500/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">예상 연간 금융소득</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(dividendSummary.totalEstimated)}</p>
              <ProgressBar ratio={dividendSummary.thresholdRatio} warn={dividendSummary.isOverThreshold} />
              <p className="mt-1 text-xs text-muted-foreground">
                기준 {formatCurrency(THRESHOLD)} 대비{" "}
                <span className={dividendSummary.isOverThreshold ? "font-semibold text-red-500" : ""}>
                  {formatNumber(dividendSummary.thresholdRatio * 100, 1)}%
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">원천징수 예상</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(dividendSummary.withholdingTax)}</p>
              <p className="mt-1 text-xs text-muted-foreground">14% + 지방세 1.4%</p>
            </CardContent>
          </Card>

          <Card className={dividendSummary.isOverThreshold ? "border-red-500/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {dividendSummary.isOverThreshold ? "종합과세 추가세금 (추정)" : "종합과세 추가세금"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${dividendSummary.isOverThreshold ? "text-red-500" : "text-muted-foreground"}`}>
                {dividendSummary.isOverThreshold ? formatCurrency(dividendSummary.additionalTax) : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dividendSummary.isOverThreshold ? "초과분 최고세율(45%) 보수적 추정" : "2천만원 미만"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">상태</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 pt-2">
              {dividendSummary.isOverThreshold ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-500">종합과세 대상</span>
                </>
              ) : dividendSummary.thresholdRatio > 0.8 ? (
                <>
                  <Info className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-500">기준 80% 초과</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-500">분리과세 범위</span>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {dividendSummary.items.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">자산</th>
                    <th className="px-5 py-3 font-medium">계좌</th>
                    <th className="px-5 py-3 text-right font-medium">평가금액</th>
                    <th className="px-5 py-3 text-right font-medium">배당수익률</th>
                    <th className="px-5 py-3 text-right font-medium">예상 배당</th>
                  </tr>
                </thead>
                <tbody>
                  {dividendSummary.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-secondary/30">
                      <td className="px-5 py-3">
                        <p className="font-medium">{item.name}</p>
                        {item.symbol && <p className="text-xs text-muted-foreground">{item.symbol}</p>}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{item.accountName}</td>
                      <td className="px-5 py-3 text-right">{formatCurrency(item.marketValue)}</td>
                      <td className="px-5 py-3 text-right">{formatNumber(item.dividendYield, 2)}%</td>
                      <td className="px-5 py-3 text-right font-medium text-primary">
                        {formatCurrency(item.estimatedIncome)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {dividendSummary.items.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              배당수익률이 입력된 보유 자산이 없습니다. 자산 편집에서 배당수익률(%)을 입력하세요.
            </CardContent>
          </Card>
        )}
      </section>

      {/* 해외주식 양도소득세 */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" />
          해외주식·크립토 양도소득세
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">미실현 양도차익</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(foreignGainSummary.totalUnrealizedGain)}</p>
              <p className="mt-1 text-xs text-muted-foreground">해외주식 + 암호화폐 미실현 이익 합계</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                과세표준 (공제 {formatCurrency(DEDUCTION)} 후)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(foreignGainSummary.taxableGain)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {foreignGainSummary.taxableGain > 0 ? "22% 세율 적용" : "기본공제 범위 내"}
              </p>
            </CardContent>
          </Card>

          <Card className={foreignGainSummary.estimatedTax > 0 ? "border-orange-500/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">예상 양도소득세</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${foreignGainSummary.estimatedTax > 0 ? "text-orange-500" : ""}`}>
                {formatCurrency(foreignGainSummary.estimatedTax)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">세율 22% (지방소득세 포함)</p>
            </CardContent>
          </Card>
        </div>

        {foreignGainSummary.items.length > 0 ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">자산</th>
                    <th className="px-5 py-3 font-medium">계좌</th>
                    <th className="px-5 py-3 font-medium">유형</th>
                    <th className="px-5 py-3 text-right font-medium">미실현 손익</th>
                    <th className="px-5 py-3 text-right font-medium">수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {foreignGainSummary.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-secondary/30">
                      <td className="px-5 py-3">
                        <p className="font-medium">{item.name}</p>
                        {item.symbol && <p className="text-xs text-muted-foreground">{item.symbol}</p>}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{item.accountName}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {ASSET_CLASS_LABELS[item.assetClass] ?? item.assetClass}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-orange-500">
                        +{formatCurrency(item.unrealizedGain)}
                      </td>
                      <td className="px-5 py-3 text-right text-orange-500">
                        +{formatNumber(item.unrealizedGainPct, 1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              해외주식·암호화폐 미실현 양도차익이 없습니다.
            </CardContent>
          </Card>
        )}
      </section>

      {/* 세테크 계좌 납입한도 */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <CheckCircle className="h-4 w-4 text-primary" />
          세테크 계좌 납입한도
        </h3>

        {taxAdvantagedSummary.accounts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              세테크 계좌가 없습니다. 계좌 편집에서 &apos;세테크&apos;를 활성화하세요.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {taxAdvantagedSummary.accounts.map((acc) => (
              <Card key={acc.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{acc.name}</CardTitle>
                  {acc.institution && (
                    <p className="text-xs text-muted-foreground">{acc.institution}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">올해 납입액</span>
                    <span className="font-medium">{formatCurrency(acc.used)}</span>
                  </div>
                  {acc.limit != null && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">연간 한도</span>
                        <span className="font-medium">{formatCurrency(acc.limit)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">잔여 한도</span>
                        <span className={`font-medium ${(acc.remaining ?? 0) <= 0 ? "text-red-500" : "text-green-500"}`}>
                          {formatCurrency(acc.remaining ?? 0)}
                        </span>
                      </div>
                      {acc.usageRatio != null && (
                        <>
                          <ProgressBar ratio={acc.usageRatio} warn={(acc.usageRatio ?? 0) >= 1} />
                          <p className="text-xs text-muted-foreground text-right">
                            {formatNumber((acc.usageRatio ?? 0) * 100, 1)}% 사용
                          </p>
                        </>
                      )}
                    </>
                  )}
                  {acc.limit == null && (
                    <p className="text-xs text-muted-foreground">납입한도 미설정</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        * 위 수치는 현재 보유 기준 추정값으로, 실제 세금과 다를 수 있습니다. 세무사 상담을 권장합니다.
      </p>
    </div>
  );
}
