import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DividendForm } from "@/components/forms/dividend-form";
import { createDividend } from "@/app/actions/dividends";
import { toNumber } from "@/lib/utils";

export default async function NewDividendPage() {
  const [accounts, holdings] = await Promise.all([
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold">배당 입력</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">새 배당 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <DividendForm
            action={createDividend}
            accounts={accounts}
            holdings={holdings.map((h) => ({
              ...h,
              quantity: toNumber(h.quantity).toString()
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
