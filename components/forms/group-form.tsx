"use client";

import { useActionState, useState } from "react";
import type { AccountGroup } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroupActionState } from "@/app/actions/groups";

type AccountOption = { id: string; name: string; institution: string | null };
type ActionFn = (state: GroupActionState, formData: FormData) => Promise<GroupActionState>;

export type GroupDefaults = Partial<AccountGroup> & {
  accountIds?: string[];
};

export function GroupForm({
  action,
  accounts,
  defaultValues
}: {
  action: ActionFn;
  accounts: AccountOption[];
  defaultValues?: GroupDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [selected, setSelected] = useState<Set<string>>(
    new Set(defaultValues?.accountIds ?? [])
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="accountIds" value={id} />
      ))}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">그룹 이름 *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues?.name ?? ""}
            placeholder="예: 절세계좌"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayOrder">정렬 순서</Label>
          <Input
            id="displayOrder"
            name="displayOrder"
            type="number"
            defaultValue={defaultValues?.displayOrder?.toString() ?? "0"}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={defaultValues?.description ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label>포함 계좌 ({selected.size}개 선택)</Label>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">먼저 계좌를 등록해 주세요.</p>
        ) : (
          <div className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selected.has(a.id)}
                  onChange={() => toggle(a.id)}
                  className="h-4 w-4 rounded border-input"
                />
                <span>
                  <span className="font-medium">{a.name}</span>
                  {a.institution && (
                    <span className="ml-1 text-xs text-muted-foreground">({a.institution})</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          취소
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  );
}
