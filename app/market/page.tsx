import Link from "next/link";
import { getMarketIndices, getMarketHistory } from "@/lib/market";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketChart } from "@/components/market-chart";

function formatValue(price: number, isYield: boolean, currency: string) {
  if (isYield) return `${price.toFixed(2)}%`;
  if (currency === "KRW")
    return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(price);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(price);
}

export default async function MarketPage({
  searchParams
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const { symbol: selectedSymbol } = await searchParams;
  const indices = await getMarketIndices();

  const active = indices.find((i) => i.symbol === selectedSymbol) ?? indices[0];
  const history = active ? await getMarketHistory(active.symbol) : [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">주요 지수</h2>

      {/* Index selector tabs */}
      <div className="flex flex-wrap gap-2">
        {indices.map((idx) => {
          const isSelected = idx.symbol === active?.symbol;
          const up = idx.changePercent > 0;
          const down = idx.changePercent < 0;
          const changeColor = up ? "text-red-500" : down ? "text-blue-500" : "text-muted-foreground";
          const hasData = idx.fetchedAt.getTime() > 0;
          return (
            <Link
              key={idx.symbol}
              href={`/market?symbol=${encodeURIComponent(idx.symbol)}`}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                isSelected
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:border-primary/50 hover:bg-secondary/50"
              }`}
            >
              <span className="font-medium">{idx.name}</span>
              {hasData && (
                <span className={`ml-2 text-xs ${changeColor}`}>
                  {up ? "▲" : down ? "▼" : ""}{Math.abs(idx.changePercent).toFixed(2)}%
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Chart */}
      {active && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{active.name}</CardTitle>
              {active.fetchedAt.getTime() > 0 && (
                <span className="text-xs text-muted-foreground">
                  {new Date(active.fetchedAt).toLocaleString("ko-KR")} 기준
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <MarketChart
              data={history}
              name={active.name}
              isYield={active.isYield}
              currency={active.currency}
              currentPrice={active.price}
              changePercent={active.changePercent}
            />
          </CardContent>
        </Card>
      )}

      {/* Summary table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">지수</th>
                <th className="px-6 py-3 text-right font-medium">현재가</th>
                <th className="px-6 py-3 text-right font-medium">등락률</th>
              </tr>
            </thead>
            <tbody>
              {indices.map((idx) => {
                const hasData = idx.fetchedAt.getTime() > 0;
                const up = idx.changePercent > 0;
                const down = idx.changePercent < 0;
                const changeColor = up ? "text-red-500" : down ? "text-blue-500" : "text-muted-foreground";
                return (
                  <tr key={idx.symbol} className="border-b last:border-0 hover:bg-secondary/30">
                    <td className="px-6 py-3 font-medium">{idx.name}</td>
                    <td className="px-6 py-3 text-right">
                      {hasData ? formatValue(idx.price, idx.isYield, idx.currency) : "—"}
                    </td>
                    <td className={`px-6 py-3 text-right font-medium ${hasData ? changeColor : ""}`}>
                      {hasData
                        ? `${up ? "▲" : down ? "▼" : ""}${Math.abs(idx.changePercent).toFixed(2)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
