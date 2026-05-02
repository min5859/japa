import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { getPortfolio, getSnapshots } from "@/lib/data";
import { groupHoldingsByAssetClass } from "@/lib/portfolio";
import { getMarketIndices } from "@/lib/market";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS } from "@/lib/labels";
import { SaveSnapshotButton } from "@/components/save-snapshot-button";
import { AllocationPieChart } from "@/components/charts/allocation-pie";
import { NetWorthLineChart } from "@/components/charts/net-worth-line";

function formatIndexValue(price: number, isYield: boolean, currency: string): string {
  if (isYield) return `${price.toFixed(2)}%`;
  if (currency === "KRW") return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(price);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(price);
}

export default async function DashboardPage() {
  const [{ accounts, summary }, indices, snapshots] = await Promise.all([
    getPortfolio(),
    getMarketIndices(),
    getSnapshots()
  ]);

  // 자산 배분 집계
  const allocationData = Object.entries(groupHoldingsByAssetClass(accounts)).map(
    ([assetClass, value]) => ({ assetClass, value })
  );

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="sm:col-span-2 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">순자산</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(summary.netWorth)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              계좌 {summary.accountCount}개 · 자산 {summary.holdingCount}종
            </p>
          </CardContent>
        </Card>

        {[
          { label: "총자산", value: summary.totalAssets },
          { label: "현금", value: summary.cash },
          { label: "투자자산", value: summary.investments },
          { label: "부채", value: -summary.liabilities }
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatCurrency(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">자산 배분</CardTitle>
          </CardHeader>
          <CardContent>
            {allocationData.length > 0 ? (
              <AllocationPieChart data={allocationData} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">보유 자산을 추가하면 배분 차트가 표시됩니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">순자산 추이</CardTitle>
            <SaveSnapshotButton />
          </CardHeader>
          <CardContent>
            <NetWorthLineChart data={snapshots} />
          </CardContent>
        </Card>
      </div>

      {/* Market indices */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">주요 지수</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {indices.map((idx) => {
            const hasData = idx.fetchedAt.getTime() > 0;
            const up = idx.changePercent > 0;
            const down = idx.changePercent < 0;
            const changeColor = up ? "text-red-500" : down ? "text-blue-500" : "text-muted-foreground";
            const changePrefix = up ? "▲" : down ? "▼" : "";
            return (
              <Card key={idx.symbol} className="px-1">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs font-medium text-muted-foreground truncate">{idx.name}</p>
                  {hasData ? (
                    <>
                      <p className="mt-1 text-sm font-semibold leading-tight">
                        {formatIndexValue(idx.price, idx.isYield, idx.currency)}
                      </p>
                      <p className={`mt-0.5 text-xs ${changeColor}`}>
                        {changePrefix}{Math.abs(idx.changePercent).toFixed(2)}%
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">—</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Account list */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">계좌 목록</h2>
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/accounts/new">
                <Plus className="h-4 w-4" />
                계좌 추가
              </Link>
            </Button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-muted-foreground">아직 등록된 계좌가 없습니다.</p>
              <Button asChild>
                <Link href="/accounts/new">첫 계좌 추가하기</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Link key={account.id} href={`/accounts/${account.id}`}>
                <Card className="h-full transition hover:border-primary/50 hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{account.name}</CardTitle>
                        {account.institution && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{account.institution}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                        {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold">
                      {formatCurrency(account.totalValueBase)}
                    </p>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">
                        보유 {account.holdings.length}종
                      </span>
                      {account.unrealizedGainPercent !== null && (
                        <span
                          className={
                            account.unrealizedGainBase > 0
                              ? "font-medium text-red-500"
                              : account.unrealizedGainBase < 0
                                ? "font-medium text-blue-500"
                                : "text-muted-foreground"
                          }
                        >
                          {account.unrealizedGainPercent >= 0 ? "+" : ""}
                          {account.unrealizedGainPercent.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Data export */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">데이터 내보내기</h2>
        <Card>
          <CardContent className="flex flex-wrap gap-2 pt-5">
            {[
              { type: "accounts", label: "계좌 CSV" },
              { type: "holdings", label: "보유 CSV" },
              { type: "dividends", label: "배당 CSV" },
              { type: "snapshots", label: "스냅샷 CSV" }
            ].map(({ type, label }) => (
              <a
                key={type}
                href={`/api/export/${type}`}
                download
                className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <Download className="h-4 w-4" />
                {label}
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
