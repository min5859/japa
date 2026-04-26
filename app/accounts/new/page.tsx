import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "@/components/forms/account-form";
import { createAccount } from "@/app/actions/accounts";

export default function NewAccountPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>새 계좌 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm action={createAccount} />
        </CardContent>
      </Card>
    </div>
  );
}
