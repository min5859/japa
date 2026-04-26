import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { getAccount } from "@/lib/data";
import { enrichAccount } from "@/lib/portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { deleteAccount } from "@/app/actions/accounts";
import { deleteHolding } from "@/app/actions/holdings";

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

export default async function AccountDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getAccount(id);
  const account = enrichAccount(raw);

  const deleteAccountWithId = deleteAccount.bind(null, id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{account.name}</h2>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
              {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
            </span>
            {account.isTaxAdvantaged && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                세테크
              </span>
            )}
          </div>
          {account.institution && (
            <p className="mt-0.5 text-sm text-muted-foreground">{account.institution}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/accounts/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              편집
            </Link>
          </Button>
          <form action={deleteAccountWithId}>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              onClick={(e) => {
                if (!confirm("계좌를 삭제하면 모든 보유 자산도 함께 삭제됩니다. 계속하시겠습니까?")) {
                  e.preventDefault();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </Button>
          </form>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 평가액</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(account.totalValueBase)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">현금</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(account.cashValueBase)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">투자자산</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(account.holdingsValueBase)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">보유 자산</h3>
          <Button asChild size="sm">
            <Link href={`/holdings/new?accountId=${id}`}>
              <Plus className="h-4 w-4" />
              자산 추가
            </Link>
          </Button>
        </div>

        {account.holdings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">보유 자산이 없습니다.</p>
              <Button asChild size="sm">
                <Link href={`/holdings/new?accountId=${id}`}>자산 추가하기</Link>
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
                    <th className="px-6 py-3 font-medium">유형</th>
                    <th className="px-6 py-3 text-right font-medium">수량</th>
                    <th className="px-6 py-3 text-right font-medium">평가금액</th>
                    <th className="px-6 py-3 text-right font-medium">평가손익</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {account.holdings.map((holding) => {
                    const deleteHoldingAction = deleteHolding.bind(null, holding.id, id);
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
                          <div className="flex justify-end gap-1">
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/holdings/${holding.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <form action={deleteHoldingAction}>
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  if (!confirm(`${holding.name}을(를) 삭제하시겠습니까?`)) {
                                    e.preventDefault();
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </form>
                          </div>
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

      {account.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{account.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
