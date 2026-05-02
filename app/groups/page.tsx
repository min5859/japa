import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function GroupsPage() {
  const groups = await prisma.accountGroup.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      accounts: {
        select: { id: true, name: true, institution: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">계좌 그룹</h2>
        <Button asChild size="sm">
          <Link href="/groups/new">
            <Plus className="h-4 w-4" />
            그룹 추가
          </Link>
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">아직 그룹이 없습니다.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                계좌를 자유롭게 분류해 통합해서 보고 싶을 때 사용하세요.
              </p>
            </div>
            <Button asChild>
              <Link href="/groups/new">첫 그룹 만들기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.id} className="transition hover:border-primary">
              <CardContent className="space-y-3 py-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{g.name}</h3>
                    {g.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{g.description}</p>
                    )}
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/groups/${g.id}`}>열기</Link>
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  계좌 {g.accounts.length}개
                </div>
                {g.accounts.length > 0 && (
                  <ul className="space-y-1 text-xs">
                    {g.accounts.slice(0, 4).map((a) => (
                      <li key={a.id} className="text-muted-foreground">
                        · {a.name}
                        {a.institution && ` (${a.institution})`}
                      </li>
                    ))}
                    {g.accounts.length > 4 && (
                      <li className="text-muted-foreground">
                        · 외 {g.accounts.length - 4}개
                      </li>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
