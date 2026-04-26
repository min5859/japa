import Link from "next/link";
import { Plus } from "lucide-react";
import { getPortfolio } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { enrichAccount } from "@/lib/portfolio";
import { RefreshPricesButton } from "@/components/refresh-prices-button";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: "입출금",
  SAVINGS: "예금/적금",
  BROKERAGE: "증권",
  RETIREMENT: "퇴직연금",
  TAX_ADVANTAGED: "세테크",
  CREDIT: "신용카드",
  LOAN: "대출",
  OTHER: "기타"
};

export default async function DashboardPage() {
  const { accounts, summary } = await getPortfolio();

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

      {/* Account list */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">계좌 목록</h2>
          <div className="flex items-center gap-2">
            <RefreshPricesButton />
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
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      보유 {account.holdings.length}종
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
