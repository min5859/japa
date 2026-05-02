import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPricesForPortfolio } from "@/lib/market";
import { enrichAccount } from "@/lib/portfolio";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function GroupDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [group, priceCtx] = await Promise.all([
    prisma.accountGroup.findUnique({
      where: { id },
      include: {
        accounts: {
          orderBy: { name: "asc" },
          include: {
            holdings: { orderBy: [{ assetClass: "asc" }, { name: "asc" }] }
          }
        }
      }
    }),
    getPricesForPortfolio()
  ]);

  if (!group) notFound();

  const accounts = group.accounts.map((a) => enrichAccount(a, priceCtx));
  const totalCash = accounts.reduce((s, a) => s + a.cashValueBase, 0);
  const totalHoldings = accounts.reduce((s, a) => s + a.holdingsValueBase, 0);
  const totalCost = accounts.reduce((s, a) => s + a.holdingsCostBasisBase, 0);
  const totalGain = totalHoldings - totalCost;
  const totalLiab = accounts.reduce((s, a) => s + a.liabilitiesBase, 0);
  const netValue = totalCash + totalHoldings - totalLiab;
  const gainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{group.name}</h2>
          {group.description && (
            <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
          )}
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/groups/${group.id}/edit`}>
            <Pencil className="h-4 w-4" />
            편집
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="space-y-1 py-5">
            <p className="text-sm font-medium text-muted-foreground">합산 평가액</p>
            <p className="text-2xl font-bold">{formatCurrency(netValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 py-5">
            <p className="text-sm font-medium text-muted-foreground">현금</p>
            <p className="text-2xl font-bold">{formatCurrency(totalCash)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 py-5">
            <p className="text-sm font-medium text-muted-foreground">투자 자산</p>
            <p className="text-2xl font-bold">{formatCurrency(totalHoldings)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 py-5">
            <p className="text-sm font-medium text-muted-foreground">미실현 손익</p>
            <p
              className={`text-2xl font-bold ${
                totalGain > 0 ? "text-red-500" : totalGain < 0 ? "text-blue-500" : ""
              }`}
            >
              {totalGain >= 0 ? "+" : ""}
              {formatCurrency(totalGain)}
            </p>
            {gainPct !== null && (
              <p className="text-xs text-muted-foreground">
                {gainPct >= 0 ? "+" : ""}
                {formatNumber(gainPct, 2)}%
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold">포함 계좌 ({accounts.length})</h3>
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              아직 이 그룹에 속한 계좌가 없습니다. 그룹을 편집해서 계좌를 추가하세요.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {accounts.map((a) => (
              <Card key={a.id} className="transition hover:border-primary">
                <CardContent className="space-y-2 py-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">
                        <Link href={`/accounts/${a.id}`} className="hover:underline">
                          {a.name}
                        </Link>
                      </p>
                      {a.institution && (
                        <p className="text-xs text-muted-foreground">{a.institution}</p>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(a.totalValueBase)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    보유 {a.holdings.length}건
                    {a.unrealizedGainPercent !== null && (
                      <>
                        {" · "}
                        <span
                          className={
                            a.unrealizedGainBase > 0
                              ? "text-red-500"
                              : a.unrealizedGainBase < 0
                                ? "text-blue-500"
                                : ""
                          }
                        >
                          {a.unrealizedGainPercent >= 0 ? "+" : ""}
                          {formatNumber(a.unrealizedGainPercent, 2)}%
                        </span>
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <Button asChild variant="ghost" size="sm">
          <Link href="/groups">← 그룹 목록으로</Link>
        </Button>
      </div>
    </div>
  );
}
