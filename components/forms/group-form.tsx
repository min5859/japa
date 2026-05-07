"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { AccountGroup } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroupActionState } from "@/app/actions/groups";
import { groupFormSchema } from "@/lib/groups/schema";

type GroupFormValues = z.input<typeof groupFormSchema>;
type GroupFormOutput = z.output<typeof groupFormSchema>;

type AccountOption = { id: string; name: string; institution: string | null };
type ActionFn = (state: GroupActionState, formData: FormData) => Promise<GroupActionState>;

export type GroupDefaults = Partial<AccountGroup> & {
  accountIds?: string[];
};

export function GroupForm({
  action,
  accounts,
  defaultValues,
}: {
  action: ActionFn;
  accounts: AccountOption[];
  defaultValues?: GroupDefaults;
}) {
  const [state, formAction] = useActionState(action, { error: null });
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GroupFormValues, unknown, GroupFormOutput>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      displayOrder: defaultValues?.displayOrder ?? 0,
      accountIds: defaultValues?.accountIds ?? [],
    },
  });

  const selectedIds = watch("accountIds") ?? [];
  const selectedCount = Array.isArray(selectedIds) ? selectedIds.length : 0;

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set("name", data.name);
    fd.set("description", data.description ?? "");
    fd.set("displayOrder", String(data.displayOrder));
    for (const id of data.accountIds ?? []) fd.append("accountIds", id);
    startTransition(() => formAction(fd));
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {state.error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">그룹 이름 *</Label>
          <Input
            id="name"
            placeholder="예: 절세계좌"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayOrder">정렬 순서</Label>
          <Input
            id="displayOrder"
            type="number"
            {...register("displayOrder")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea id="description" rows={2} {...register("description")} />
      </div>

      <div className="space-y-2">
        <Label>포함 계좌 ({selectedCount}개 선택)</Label>
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
                  value={a.id}
                  className="h-4 w-4 rounded border-input"
                  {...register("accountIds")}
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
