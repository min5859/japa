import type { Currency } from "@prisma/client";
import { getAccountsForSelect } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoldingForm } from "@/components/forms/holding-form";
import { createHolding } from "@/app/actions/holdings";

const KNOWN_CURRENCIES = new Set<Currency>([
  "KRW", "USD", "EUR", "JPY", "CNY", "GBP", "HKD", "SGD"
]);

function normalizeCurrency(input: string | undefined): Currency {
  if (!input) return "KRW";
  const upper = input.toUpperCase() as Currency;
  return KNOWN_CURRENCIES.has(upper) ? upper : "KRW";
}

export default async function NewHoldingPage({
  searchParams
}: {
  searchParams: Promise<{
    accountId?: string;
    symbol?: string;
    name?: string;
    currency?: string;
  }>;
}) {
  const { accountId, symbol, name, currency } = await searchParams;
  const accounts = await getAccountsForSelect();

  // Pre-fill from /quote → "내 보유에 추가" deep link
  const prefilled = symbol || name || currency
    ? {
        symbol: symbol ?? null,
        name: name ?? "",
        currency: normalizeCurrency(currency)
      }
    : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>새 자산 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <HoldingForm
            action={createHolding}
            accounts={accounts}
            defaultAccountId={accountId}
            defaultValues={prefilled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
