"use client";

import { useActionState } from "react";
import type { Holding } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { HoldingActionState } from "@/app/actions/holdings";

const ASSET_CLASSES = [
  { value: "CASH", label: "현금" },
  { value: "DOMESTIC_STOCK", label: "국내주식" },
  { value: "INTERNATIONAL_STOCK", label: "해외주식" },
  { value: "ETF", label: "ETF" },
  { value: "BOND", label: "채권" },
  { value: "FUND", label: "펀드" },
  { value: "CRYPTO", label: "암호화폐" },
  { value: "REAL_ESTATE", label: "부동산" },
  { value: "LIABILITY", label: "부채" },
  { value: "OTHER", label: "기타" }
];

const CURRENCIES = [
  { value: "KRW", label: "KRW - 원화" },
  { value: "USD", label: "USD - 달러" },
  { value: "EUR", label: "EUR - 유로" },
  { value: "JPY", label: "JPY - 엔화" },
  { value: "CNY", label: "CNY - 위안" },
  { value: "GBP", label: "GBP - 파운드" },
  { value: "HKD", label: "HKD - 홍콩달러" },
  { value: "SGD", label: "SGD - 싱가포르달러" }
];

type AccountOption = { id: string; name: string; institution: string | null };
type ActionFn = (state: HoldingActionState, formData: FormData) => Promise<HoldingActionState>;

export function HoldingForm({
  action,
  accounts,
  defaultValues,
  defaultAccountId
}: {
  action: ActionFn;
  accounts: AccountOption[];
  defaultValues?: Partial<Holding>;
  defaultAccountId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="accountId">계좌 *</Label>
        <Select
          id="accountId"
          name="accountId"
          defaultValue={defaultValues?.accountId ?? defaultAccountId ?? ""}
          required
        >
          <option value="">계좌 선택...</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}{a.institution ? ` (${a.institution})` : ""}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">자산명 *</Label>
          <Input id="name" name="name" defaultValue={defaultValues?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="symbol">티커 / 코드</Label>
          <Input
            id="symbol"
            name="symbol"
            placeholder="예: AAPL, 005930.KS, 035720.KQ"
            defaultValue={defaultValues?.symbol ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            Yahoo Finance 심볼 · 코스피는 .KS, 코스닥은 .KQ 접미사 필요
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assetClass">자산 유형</Label>
          <Select id="assetClass" name="assetClass" defaultValue={defaultValues?.assetClass ?? "ETF"}>
            {ASSET_CLASSES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">거래 통화</Label>
          <Select id="currency" name="currency" defaultValue={defaultValues?.currency ?? "KRW"}>
            {CURRENCIES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="quantity">수량</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="0.00000001"
            placeholder="0"
            defaultValue={defaultValues?.quantity?.toString() ?? "0"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="averageCost">평균 매수가</Label>
          <Input
            id="averageCost"
            name="averageCost"
            type="number"
            step="0.0001"
            placeholder="0"
            defaultValue={defaultValues?.averageCost?.toString() ?? "0"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manualPrice">현재가 (수동)</Label>
          <Input
            id="manualPrice"
            name="manualPrice"
            type="number"
            step="0.0001"
            placeholder="0"
            defaultValue={defaultValues?.manualPrice?.toString() ?? "0"}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="manualFxRate">환율 (원화 기준)</Label>
          <Input
            id="manualFxRate"
            name="manualFxRate"
            type="number"
            step="0.00000001"
            placeholder="1"
            defaultValue={defaultValues?.manualFxRate?.toString() ?? "1"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dividendYield">배당수익률 (%)</Label>
          <Input
            id="dividendYield"
            name="dividendYield"
            type="number"
            step="0.01"
            placeholder="선택사항"
            defaultValue={defaultValues?.dividendYield?.toString() ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">메모</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={defaultValues?.notes ?? ""} />
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
