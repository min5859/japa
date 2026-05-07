"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { Account } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AccountActionState } from "@/app/actions/accounts";
import { ACCOUNT_TYPES, accountFormSchema } from "@/lib/accounts/schema";
import { CURRENCIES } from "@/lib/labels";

type AccountFormValues = z.input<typeof accountFormSchema>;
type AccountFormOutput = z.output<typeof accountFormSchema>;

type ActionFn = (state: AccountActionState, formData: FormData) => Promise<AccountActionState>;

export type AccountDefaults = Omit<
  Partial<Account>,
  "cashBalance" | "annualContributionLimit" | "contributionYTD"
> & {
  cashBalance?: number | string | null;
  annualContributionLimit?: number | string | null;
  contributionYTD?: number | string | null;
};

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function AccountForm({
  action,
  defaultValues,
}: {
  action: ActionFn;
  defaultValues?: AccountDefaults;
}) {
  const [state, formAction] = useActionState(action, { error: null });
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AccountFormValues, unknown, AccountFormOutput>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      institution: defaultValues?.institution ?? "",
      type: defaultValues?.type ?? "BROKERAGE",
      currency: defaultValues?.currency ?? "KRW",
      cashBalance: toNumber(defaultValues?.cashBalance, 0),
      isTaxAdvantaged: defaultValues?.isTaxAdvantaged ?? false,
      annualContributionLimit:
        defaultValues?.annualContributionLimit == null
          ? null
          : toNumber(defaultValues.annualContributionLimit, 0),
      contributionYTD: toNumber(defaultValues?.contributionYTD, 0),
      notes: defaultValues?.notes ?? "",
    },
  });

  const currency = watch("currency");
  const isTaxAdvantaged = watch("isTaxAdvantaged");
  const cashStep = currency === "KRW" ? "1" : "0.01";

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set("name", data.name);
    fd.set("institution", data.institution ?? "");
    fd.set("type", data.type);
    fd.set("currency", data.currency);
    fd.set("cashBalance", String(data.cashBalance));
    fd.set("isTaxAdvantaged", data.isTaxAdvantaged ? "true" : "false");
    if (data.isTaxAdvantaged && data.annualContributionLimit != null) {
      fd.set("annualContributionLimit", String(data.annualContributionLimit));
    }
    fd.set("contributionYTD", String(data.contributionYTD));
    fd.set("notes", data.notes ?? "");
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
          <Label htmlFor="name">계좌명 *</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="institution">금융기관</Label>
          <Input
            id="institution"
            placeholder="예: 삼성증권, 카카오뱅크"
            {...register("institution")}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">계좌 유형</Label>
          <Select id="type" {...register("type")}>
            {ACCOUNT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">기준 통화</Label>
          <Select id="currency" {...register("currency")}>
            {CURRENCIES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cashBalance">현금 잔액</Label>
        <Input
          id="cashBalance"
          type="number"
          step={cashStep}
          placeholder="0"
          {...register("cashBalance")}
        />
        {errors.cashBalance && (
          <p className="text-xs text-destructive">{errors.cashBalance.message}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isTaxAdvantagedCheck"
          className="h-4 w-4 rounded"
          {...register("isTaxAdvantaged")}
        />
        <Label htmlFor="isTaxAdvantagedCheck">세테크 계좌 (ISA, IRP, 연금저축 등)</Label>
      </div>

      {isTaxAdvantaged && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="annualContributionLimit">연간 납입 한도 (원)</Label>
            <Input
              id="annualContributionLimit"
              type="number"
              step="1"
              placeholder="예: 4000000"
              {...register("annualContributionLimit")}
            />
            {errors.annualContributionLimit && (
              <p className="text-xs text-destructive">
                {errors.annualContributionLimit.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contributionYTD">올해 납입액 (원)</Label>
            <Input
              id="contributionYTD"
              type="number"
              step="1"
              placeholder="0"
              {...register("contributionYTD")}
            />
            {errors.contributionYTD && (
              <p className="text-xs text-destructive">
                {errors.contributionYTD.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              매년 1월 1일 0으로 초기화하세요.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">메모</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
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
