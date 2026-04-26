import { getAccount } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "@/components/forms/account-form";
import { updateAccount } from "@/app/actions/accounts";

export default async function EditAccountPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccount(id);
  const action = updateAccount.bind(null, id);

  const formDefaults = {
    ...account,
    cashBalance: Number(account.cashBalance),
    annualContributionLimit:
      account.annualContributionLimit != null ? Number(account.annualContributionLimit) : null
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>계좌 편집 — {account.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm action={action} defaultValues={formDefaults} />
        </CardContent>
      </Card>
    </div>
  );
}
