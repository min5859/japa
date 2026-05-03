"use client";

import { useActionState, useState } from "react";
import type { Account } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AccountActionState } from "@/app/actions/accounts";
import { ACCOUNT_TYPES } from "@/lib/accounts/schema";
import { CURRENCIES } from "@/lib/labels";

type ActionFn = (state: AccountActionState, formData: FormData) => Promise<AccountActionState>;

export type AccountDefaults = Omit<
  Partial<Account>,
  "cashBalance" | "annualContributionLimit" | "contributionYTD"
> & {
  cashBalance?: number | string | null;
  annualContributionLimit?: number | string | null;
  contributionYTD?: number | string | null;
};

export function AccountForm({
  action,
  defaultValues
}: {
  action: ActionFn;
  defaultValues?: AccountDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [isTaxAdvantaged, setIsTaxAdvantaged] = useState(
    defaultValues?.isTaxAdvantaged ?? false
  );
  const [currency, setCurrency] = useState<string>(defaultValues?.currency ?? "KRW");
  const cashStep = currency === "KRW" ? "1" : "0.01";

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">계좌명 *</Label>
          <Input id="name" name="name" defaultValue={defaultValues?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="institution">금융기관</Label>
          <Input
            id="institution"
            name="institution"
            placeholder="예: 삼성증권, 카카오뱅크"
            defaultValue={defaultValues?.institution ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">계좌 유형</Label>
          <Select id="type" name="type" defaultValue={defaultValues?.type ?? "BROKERAGE"}>
            {ACCOUNT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">기준 통화</Label>
          <Select
            id="currency"
            name="currency"
            defaultValue={defaultValues?.currency ?? "KRW"}
            onChange={(e) => setCurrency(e.target.value)}
          >
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
          name="cashBalance"
          type="number"
          step={cashStep}
          placeholder="0"
          defaultValue={defaultValues?.cashBalance?.toString() ?? "0"}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isTaxAdvantagedCheck"
          checked={isTaxAdvantaged}
          onChange={(e) => setIsTaxAdvantaged(e.target.checked)}
          className="h-4 w-4 rounded"
        />
        <input type="hidden" name="isTaxAdvantaged" value={isTaxAdvantaged ? "true" : "false"} />
        <Label htmlFor="isTaxAdvantagedCheck">세테크 계좌 (ISA, IRP, 연금저축 등)</Label>
      </div>

      {isTaxAdvantaged && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="annualContributionLimit">연간 납입 한도 (원)</Label>
            <Input
              id="annualContributionLimit"
              name="annualContributionLimit"
              type="number"
              step="1"
              placeholder="예: 4000000"
              defaultValue={defaultValues?.annualContributionLimit?.toString() ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contributionYTD">올해 납입액 (원)</Label>
            <Input
              id="contributionYTD"
              name="contributionYTD"
              type="number"
              step="1"
              placeholder="0"
              defaultValue={defaultValues?.contributionYTD?.toString() ?? "0"}
            />
            <p className="text-xs text-muted-foreground">
              매년 1월 1일 0으로 초기화하세요.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">메모</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
        />
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
