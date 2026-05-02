import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber, toNumber } from "@/lib/utils";

export default async function DividendsPage() {
  const dividends = await prisma.dividend.findMany({
    orderBy: { dividendDate: "desc" },
    include: {
      account: { select: { id: true, name: true, currency: true } },
      holding: { select: { id: true, name: true, symbol: true } }
    }
  });

  const yearTotalsKrw = dividends.reduce(
    (acc, d) => {
      const year = d.dividendDate.getUTCFullYear();
      const krw = toNumber(d.totalAmount) * toNumber(d.fxRate);
      const tax = toNumber(d.taxAmount) * toNumber(d.fxRate);
      acc[year] = acc[year] ?? { gross: 0, tax: 0, net: 0, count: 0 };
      acc[year].gross += krw;
      acc[year].tax += tax;
      acc[year].net += krw - tax;
      acc[year].count += 1;
      return acc;
    },
    {} as Record<number, { gross: number; tax: number; net: number; count: number }>
  );

  const yearKeys = Object.keys(yearTotalsKrw)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">배당 내역</h2>
        <Button asChild size="sm">
          <Link href="/dividends/new">
            <Plus className="h-4 w-4" />
            배당 입력
          </Link>
        </Button>
      </div>

      {yearKeys.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {yearKeys.slice(0, 3).map((year) => {
            const t = yearTotalsKrw[year];
            return (
              <Card key={year}>
                <CardContent className="space-y-1 py-5">
                  <p className="text-sm font-medium text-muted-foreground">
                    {year}년 ({t.count}건)
                  </p>
                  <p className="text-2xl font-bold">{formatCurrency(t.net)}</p>
                  <p className="text-xs text-muted-foreground">
                    세전 {formatCurrency(t.gross)} · 세금 {formatCurrency(t.tax)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {dividends.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">아직 등록된 배당 내역이 없습니다.</p>
            <Button asChild>
              <Link href="/dividends/new">첫 배당 입력하기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">지급일</th>
                  <th className="px-5 py-3 font-medium">자산</th>
                  <th className="px-5 py-3 font-medium">계좌</th>
                  <th className="px-5 py-3 text-right font-medium">수량</th>
                  <th className="px-5 py-3 text-right font-medium">주당</th>
                  <th className="px-5 py-3 text-right font-medium">세전</th>
                  <th className="px-5 py-3 text-right font-medium">세금</th>
                  <th className="px-5 py-3 text-right font-medium">실수령</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {dividends.map((d) => {
                  const total = toNumber(d.totalAmount);
                  const tax = toNumber(d.taxAmount);
                  const net = toNumber(d.netAmount);
                  return (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-secondary/30">
                      <td className="px-5 py-3 text-muted-foreground">
                        {d.dividendDate.toISOString().slice(0, 10)}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium">
                          {d.holding?.name ?? d.symbol ?? "—"}
                        </p>
                        {d.symbol && d.holding?.name && (
                          <p className="text-xs text-muted-foreground">{d.symbol}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{d.account.name}</td>
                      <td className="px-5 py-3 text-right">
                        {formatNumber(toNumber(d.quantity), 4)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatCurrency(toNumber(d.amountPerShare), d.currency)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatCurrency(total, d.currency)}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">
                        {tax > 0 ? formatCurrency(tax, d.currency) : "—"}
                        {d.isTaxOverridden && (
                          <span className="ml-1 text-[10px]">수동</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-primary">
                        {formatCurrency(net, d.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/dividends/${d.id}/edit`}>편집</Link>
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
