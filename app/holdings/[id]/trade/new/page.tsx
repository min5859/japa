import { notFound } from "next/navigation";
import type { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/forms/transaction-form";
import { createTransaction } from "@/app/actions/transactions";
import { toNumber } from "@/lib/utils";

const ALLOWED_TYPES: TransactionType[] = ["BUY", "SELL"];

export default async function NewTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const holding = await prisma.holding.findUnique({
    where: { id },
    include: {
      account: { select: { name: true, currency: true, cashBalance: true } },
    },
  });
  if (!holding) notFound();

  const requested = sp.type?.toUpperCase() as TransactionType | undefined;
  const defaultType: TransactionType =
    requested && ALLOWED_TYPES.includes(requested) ? requested : "BUY";

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>
            거래 추가 — {holding.name}
            {holding.symbol ? ` · ${holding.symbol}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            action={createTransaction}
            holding={{
              id: holding.id,
              name: holding.name,
              symbol: holding.symbol,
              currency: holding.currency,
              quantity: toNumber(holding.quantity),
              averageCost: toNumber(holding.averageCost),
            }}
            account={{
              name: holding.account.name,
              currency: holding.account.currency,
              cashBalance: toNumber(holding.account.cashBalance),
            }}
            defaultType={defaultType}
          />
        </CardContent>
      </Card>
    </div>
  );
}
