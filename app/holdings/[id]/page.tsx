import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, Trash2 } from "lucide-react";
import { getHolding, getHoldingTransactions } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { formatCurrency, formatNumber, toNumber } from "@/lib/utils";
import { ASSET_CLASS_LABELS } from "@/lib/holdings/schema";
import { TRANSACTION_TYPE_LABELS } from "@/lib/transactions/schema";
import { deleteTransaction } from "@/app/actions/transactions";

export default async function HoldingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [holding, transactions] = await Promise.all([
    getHolding(id),
    getHoldingTransactions(id),
  ]);

  const quantity = toNumber(holding.quantity);
  const averageCost = toNumber(holding.averageCost);
  const realizedTotal = transactions
    .filter((t) => t.type === "SELL" && t.realizedGain !== null)
    .reduce((s, t) => s + toNumber(t.realizedGain), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{holding.name}</h2>
            {holding.symbol && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                {holding.symbol}
              </span>
            )}
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
              {ASSET_CLASS_LABELS[holding.assetClass] ?? holding.assetClass}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Link
              href={`/accounts/${holding.account.id}`}
              className="hover:text-foreground hover:underline"
            >
              {holding.account.name}
              {holding.account.institution ? ` (${holding.account.institution})` : ""}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/holdings/${id}/trade/new?type=BUY`}>
              <ArrowUpRight className="h-4 w-4" />
              매수
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/holdings/${id}/trade/new?type=SELL`}>
              <ArrowDownRight className="h-4 w-4" />
              매도
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/holdings/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              편집
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">보유 수량</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(quantity, 4)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">평균단가</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(averageCost, holding.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              누적 실현 손익 ({holding.currency})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                realizedTotal > 0
                  ? "text-red-500"
                  : realizedTotal < 0
                    ? "text-blue-500"
                    : ""
              }`}
            >
              {realizedTotal >= 0 ? "+" : ""}
              {formatCurrency(realizedTotal, holding.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">거래 내역</h3>
          <Button asChild size="sm" variant="outline">
            <Link href={`/holdings/${id}/trade/new`}>
              <Plus className="h-4 w-4" />
              거래 추가
            </Link>
          </Button>
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">아직 등록된 거래가 없습니다.</p>
              <Button asChild size="sm">
                <Link href={`/holdings/${id}/trade/new?type=BUY`}>첫 매수 입력하기</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-6 py-3 font-medium">거래일</th>
                    <th className="px-6 py-3 font-medium">구분</th>
                    <th className="px-6 py-3 text-right font-medium">수량</th>
                    <th className="px-6 py-3 text-right font-medium">단가</th>
                    <th className="px-6 py-3 text-right font-medium">수수료</th>
                    <th className="px-6 py-3 text-right font-medium">실현 손익</th>
                    <th className="px-6 py-3 font-medium">메모</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => {
                    const realized = t.realizedGain !== null ? toNumber(t.realizedGain) : null;
                    const realizedColor =
                      realized === null
                        ? "text-muted-foreground"
                        : realized > 0
                          ? "text-red-500"
                          : realized < 0
                            ? "text-blue-500"
                            : "text-muted-foreground";
                    const deleteAction = deleteTransaction.bind(null, t.id);

                    return (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-secondary/30">
                        <td className="px-6 py-3">
                          {t.tradeDate.toISOString().slice(0, 10)}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              t.type === "BUY"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-blue-500/10 text-blue-500"
                            }`}
                          >
                            {TRANSACTION_TYPE_LABELS[t.type] ?? t.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {formatNumber(toNumber(t.quantity), 4)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {formatCurrency(toNumber(t.pricePerShare), t.currency)}
                        </td>
                        <td className="px-6 py-3 text-right text-muted-foreground">
                          {toNumber(t.fee) > 0
                            ? formatCurrency(toNumber(t.fee), t.currency)
                            : "—"}
                        </td>
                        <td className={`px-6 py-3 text-right font-medium ${realizedColor}`}>
                          {realized === null ? (
                            "—"
                          ) : (
                            <>
                              {realized >= 0 ? "+" : ""}
                              {formatCurrency(realized, t.currency)}
                            </>
                          )}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {t.notes ?? ""}
                        </td>
                        <td className="px-6 py-3">
                          <DeleteButton
                            action={deleteAction}
                            message={`이 거래를 삭제하면 평균단가·수량${
                              t.cashAdjusted ? "·계좌 현금잔액" : ""
                            }이 거래 입력 전 상태로 역연산됩니다. 계속하시겠습니까?`}
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </DeleteButton>
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

      {holding.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{holding.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
