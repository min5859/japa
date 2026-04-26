import { getAccountsForSelect } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoldingForm } from "@/components/forms/holding-form";
import { createHolding } from "@/app/actions/holdings";

export default async function NewHoldingPage({
  searchParams
}: {
  searchParams: Promise<{ accountId?: string }>;
}) {
  const { accountId } = await searchParams;
  const accounts = await getAccountsForSelect();

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>새 자산 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <HoldingForm action={createHolding} accounts={accounts} defaultAccountId={accountId} />
        </CardContent>
      </Card>
    </div>
  );
}
