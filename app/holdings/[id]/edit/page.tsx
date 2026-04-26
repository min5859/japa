import { getHolding, getAccountsForSelect } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoldingForm } from "@/components/forms/holding-form";
import { updateHolding } from "@/app/actions/holdings";

export default async function EditHoldingPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [holding, accounts] = await Promise.all([getHolding(id), getAccountsForSelect()]);
  const action = updateHolding.bind(null, id);

  const formDefaults = {
    ...holding,
    quantity: Number(holding.quantity),
    averageCost: Number(holding.averageCost),
    manualPrice: Number(holding.manualPrice),
    manualFxRate: Number(holding.manualFxRate),
    dividendYield: holding.dividendYield != null ? Number(holding.dividendYield) : null
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>자산 편집 — {holding.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <HoldingForm action={action} accounts={accounts} defaultValues={formDefaults} />
        </CardContent>
      </Card>
    </div>
  );
}
