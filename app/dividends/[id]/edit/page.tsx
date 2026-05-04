import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DividendForm } from "@/components/forms/dividend-form";
import { DeleteButton } from "@/components/delete-button";
import { updateDividend, deleteDividend } from "@/app/actions/dividends";
import { toNumber } from "@/lib/utils";

export default async function EditDividendPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dividend, accounts, holdings] = await Promise.all([
    prisma.dividend.findUnique({ where: { id } }),
    prisma.account.findMany({
      select: { id: true, name: true, institution: true },
      orderBy: { name: "asc" }
    }),
    prisma.holding.findMany({
      select: {
        id: true,
        name: true,
        symbol: true,
        accountId: true,
        currency: true,
        quantity: true
      },
      orderBy: [{ accountId: "asc" }, { name: "asc" }]
    })
  ]);

  if (!dividend) notFound();

  const updateAction = updateDividend.bind(null, dividend.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold">배당 편집</h2>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <CardTitle className="text-base">배당 내역 수정</CardTitle>
          <DeleteButton
            action={async () => {
              "use server";
              await deleteDividend(dividend.id);
            }}
            message="이 배당 내역을 삭제하시겠습니까?"
          >
            삭제
          </DeleteButton>
        </CardHeader>
        <CardContent>
          <DividendForm
            action={updateAction}
            accounts={accounts}
            holdings={holdings.map((h) => ({
              ...h,
              quantity: toNumber(h.quantity).toString()
            }))}
            defaultValues={{
              ...dividend,
              amountPerShare: toNumber(dividend.amountPerShare),
              quantity: toNumber(dividend.quantity),
              totalAmount: toNumber(dividend.totalAmount),
              taxAmount: toNumber(dividend.taxAmount),
              netAmount: toNumber(dividend.netAmount),
              fxRate: toNumber(dividend.fxRate)
            }}
          />
        </CardContent>
      </Card>
      <div className="text-center">
        <Button asChild variant="ghost" size="sm">
          <a href="/dividends">← 목록으로</a>
        </Button>
      </div>
    </div>
  );
}
