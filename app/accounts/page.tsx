import Link from "next/link";
import { Plus } from "lucide-react";
import { getPortfolio } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

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

export default async function AccountsPage() {
  const { accounts } = await getPortfolio();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">계좌 관리</h2>
        <Button asChild size="sm">
          <Link href="/accounts/new">
            <Plus className="h-4 w-4" />
            계좌 추가
          </Link>
        </Button>
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
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                        {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                      </span>
                      {account.isTaxAdvantaged && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          세테크
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xl font-semibold">{formatCurrency(account.totalValueBase)}</p>
                    {account.unrealizedGainPercent !== null && (
                      <span
                        className={`text-sm font-medium ${
                          account.unrealizedGainBase > 0
                            ? "text-red-500"
                            : account.unrealizedGainBase < 0
                              ? "text-blue-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        {account.unrealizedGainPercent >= 0 ? "+" : ""}
                        {account.unrealizedGainPercent.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span>현금 {formatCurrency(account.cashValueBase)}</span>
                    <span>보유 {account.holdings.length}종</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
