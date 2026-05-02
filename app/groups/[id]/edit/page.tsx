import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GroupForm } from "@/components/forms/group-form";
import { DeleteButton } from "@/components/delete-button";
import { updateGroup, deleteGroup } from "@/app/actions/groups";

export default async function EditGroupPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [group, accounts] = await Promise.all([
    prisma.accountGroup.findUnique({
      where: { id },
      include: { accounts: { select: { id: true } } }
    }),
    prisma.account.findMany({
      select: { id: true, name: true, institution: true },
      orderBy: { name: "asc" }
    })
  ]);

  if (!group) notFound();

  const updateAction = updateGroup.bind(null, group.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold">그룹 편집</h2>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <CardTitle className="text-base">{group.name}</CardTitle>
          <DeleteButton
            action={async () => {
              "use server";
              await deleteGroup(group.id);
            }}
            message="이 그룹을 삭제하시겠습니까? (계좌 자체는 삭제되지 않습니다)"
          >
            삭제
          </DeleteButton>
        </CardHeader>
        <CardContent>
          <GroupForm
            action={updateAction}
            accounts={accounts}
            defaultValues={{
              ...group,
              accountIds: group.accounts.map((a) => a.id)
            }}
          />
        </CardContent>
      </Card>
      <div className="text-center">
        <Button asChild variant="ghost" size="sm">
          <a href="/groups">← 목록으로</a>
        </Button>
      </div>
    </div>
  );
}
