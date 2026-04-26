import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllHoldings } from "@/lib/data";
import { enrichHolding } from "@/lib/portfolio";
import { getPricesForPortfolio } from "@/lib/market";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export default async function HoldingsPage() {
  const [rawHoldings, priceCtx] = await Promise.all([getAllHoldings(), getPricesForPortfolio()]);
  const holdings = rawHoldings.map((h) => ({ ...enrichHolding(h, priceCtx), account: h.account }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">보유 자산</h2>
        <Button asChild size="sm">
          <Link href="/holdings/new">
            <Plus className="h-4 w-4" />
            자산 추가
          </Link>
        </Button>
      </div>

      {holdings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">아직 등록된 자산이 없습니다.</p>
            <Button asChild>
              <Link href="/holdings/new">첫 자산 추가하기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-6 py-3 font-medium">자산</th>
                  <th className="px-6 py-3 font-medium">계좌</th>
                  <th className="px-6 py-3 font-medium">유형</th>
                  <th className="px-6 py-3 text-right font-medium">수량</th>
                  <th className="px-6 py-3 text-right font-medium">평가금액</th>
                  <th className="px-6 py-3 text-right font-medium">평가손익</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => {
                  const gainColor =
                    holding.unrealizedGainBase > 0
                      ? "text-red-500"
                      : holding.unrealizedGainBase < 0
                        ? "text-blue-500"
                        : "text-muted-foreground";

                  return (
                    <tr key={holding.id} className="border-b last:border-0 hover:bg-secondary/30">
                      <td className="px-6 py-3">
                        <p className="font-medium">{holding.name}</p>
                        {holding.symbol && (
                          <p className="text-xs text-muted-foreground">{holding.symbol}</p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        <Link
                          href={`/accounts/${holding.account.id}`}
                          className="hover:text-foreground hover:underline"
                        >
                          {holding.account.name}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {ASSET_CLASS_LABELS[holding.assetClass] ?? holding.assetClass}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {formatNumber(Number(holding.quantity), 4)}
                      </td>
                      <td className="px-6 py-3 text-right font-medium">
                        {formatCurrency(holding.marketValueBase)}
                      </td>
                      <td className={`px-6 py-3 text-right font-medium ${gainColor}`}>
                        {holding.unrealizedGainBase >= 0 ? "+" : ""}
                        {formatCurrency(holding.unrealizedGainBase)}
                      </td>
                      <td className="px-6 py-3">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/holdings/${holding.id}/edit`}>편집</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
