import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupForm } from "@/components/forms/group-form";
import { createGroup } from "@/app/actions/groups";

export default async function NewGroupPage() {
  const accounts = await prisma.account.findMany({
    select: { id: true, name: true, institution: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold">새 그룹</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">그룹 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupForm action={createGroup} accounts={accounts} />
        </CardContent>
      </Card>
    </div>
  );
}
