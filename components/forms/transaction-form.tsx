"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { Currency, TransactionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TransactionActionState } from "@/app/actions/transactions";
import { TRANSACTION_TYPES, transactionFormSchema } from "@/lib/transactions/schema";
import { CURRENCIES } from "@/lib/labels";

type TransactionFormValues = z.input<typeof transactionFormSchema>;
type TransactionFormOutput = z.output<typeof transactionFormSchema>;

type ActionFn = (
  state: TransactionActionState,
  formData: FormData
) => Promise<TransactionActionState>;

type Props = {
  action: ActionFn;
  holding: {
    id: string;
    name: string;
    symbol: string | null;
    currency: Currency;
    quantity: number;
    averageCost: number;
  };
  account: {
    name: string;
    currency: Currency;
    cashBalance: number;
  };
  defaultType?: TransactionType;
};

export function TransactionForm({ action, holding, account, defaultType = "BUY" }: Props) {
  const [state, formAction] = useActionState(action, { error: null });
  const [pending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormValues, unknown, TransactionFormOutput>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      holdingId: holding.id,
      type: defaultType,
      tradeDate: today,
      quantity: 0,
      pricePerShare: 0,
      fee: 0,
      currency: holding.currency,
      fxRate: 1,
      cashAdjusted: "true",
      notes: "",
    },
  });

  const type = watch("type");
  const cashAdjustedRaw = watch("cashAdjusted");
  const cashAdjusted = cashAdjustedRaw === "on" || cashAdjustedRaw === "true";
  const currency = watch("currency");
  const cashCurrencyMatches = account.currency === currency;

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set("holdingId", data.holdingId);
    fd.set("type", data.type);
    fd.set("tradeDate", data.tradeDate);
    fd.set("quantity", String(data.quantity));
    fd.set("pricePerShare", String(data.pricePerShare));
    fd.set("fee", String(data.fee));
    fd.set("currency", data.currency);
    fd.set("fxRate", String(data.fxRate));
    fd.set("cashAdjusted", data.cashAdjusted ? "true" : "false");
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

      <div className="rounded-xl border bg-secondary/30 p-4 text-sm">
        <p className="font-medium">
          {holding.name}
          {holding.symbol ? ` · ${holding.symbol}` : ""}
        </p>
        <p className="text-muted-foreground">
          현재 보유 {holding.quantity.toLocaleString()} · 평균단가{" "}
          {holding.averageCost.toLocaleString()} {holding.currency}
        </p>
        <p className="text-xs text-muted-foreground">
          계좌: {account.name} ({account.currency}) · 현금잔액{" "}
          {account.cashBalance.toLocaleString()}
        </p>
      </div>

      <input type="hidden" {...register("holdingId")} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">거래 유형 *</Label>
          <Select id="type" {...register("type")}>
            {TRANSACTION_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tradeDate">거래일 *</Label>
          <Input id="tradeDate" type="date" {...register("tradeDate")} />
          {errors.tradeDate && (
            <p className="text-xs text-destructive">{errors.tradeDate.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="quantity">수량 *</Label>
          <Input
            id="quantity"
            type="number"
            step="0.00000001"
            placeholder="0"
            {...register("quantity")}
          />
          {errors.quantity && (
            <p className="text-xs text-destructive">{errors.quantity.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pricePerShare">단가 *</Label>
          <Input
            id="pricePerShare"
            type="number"
            step="0.0001"
            placeholder="0"
            {...register("pricePerShare")}
          />
          {errors.pricePerShare && (
            <p className="text-xs text-destructive">{errors.pricePerShare.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="fee">수수료</Label>
          <Input
            id="fee"
            type="number"
            step="0.0001"
            placeholder="0"
            {...register("fee")}
          />
          <p className="text-[11px] text-muted-foreground">
            매수 수수료는 평균단가에 가산
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency">통화</Label>
          <Select id="currency" {...register("currency")}>
            {CURRENCIES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <p className="text-[11px] text-muted-foreground">
            종목 통화({holding.currency})와 일치해야 합니다
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fxRate">환율 (원화 기준)</Label>
          <Input
            id="fxRate"
            type="number"
            step="0.00000001"
            placeholder="1"
            {...register("fxRate")}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={cashAdjusted}
            onChange={(e) =>
              setValue("cashAdjusted", e.target.checked ? "true" : "false", {
                shouldDirty: true,
              })
            }
            className="h-4 w-4 rounded border-input"
          />
          계좌 현금잔액 자동 갱신 ({type === "BUY" ? "차감" : "입금"})
        </label>
        <p className="text-xs text-muted-foreground">
          {cashCurrencyMatches
            ? `${type === "BUY" ? "매수 시 단가×수량+수수료만큼 차감" : "매도 시 단가×수량-수수료만큼 입금"} (계좌·거래 통화 일치)`
            : `계좌 통화(${account.currency})와 거래 통화(${currency})가 달라 자동 갱신은 무시됩니다.`}
        </p>
      </div>

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
