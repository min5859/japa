"use client";

import { useActionState, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { Currency, Dividend } from "@prisma/client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DividendActionState } from "@/app/actions/dividends";
import { getFxRateAction } from "@/app/actions/symbols";
import { dividendFormSchema } from "@/lib/dividends/schema";
import { CURRENCIES } from "@/lib/labels";

type DividendFormValues = z.input<typeof dividendFormSchema>;
type DividendFormOutput = z.output<typeof dividendFormSchema>;

type AccountOption = { id: string; name: string; institution: string | null };
type HoldingOption = {
  id: string;
  name: string;
  symbol: string | null;
  accountId: string;
  currency: string;
  quantity: string;
};

type ActionFn = (state: DividendActionState, formData: FormData) => Promise<DividendActionState>;

export type DividendDefaults = Omit<
  Partial<Dividend>,
  | "amountPerShare"
  | "quantity"
  | "totalAmount"
  | "taxAmount"
  | "netAmount"
  | "fxRate"
  | "dividendDate"
  | "exDividendDate"
> & {
  amountPerShare?: number | string | null;
  quantity?: number | string | null;
  totalAmount?: number | string | null;
  taxAmount?: number | string | null;
  netAmount?: number | string | null;
  fxRate?: number | string | null;
  dividendDate?: string | Date | null;
  exDividendDate?: string | Date | null;
};

function dateInputValue(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function DividendForm({
  action,
  accounts,
  holdings,
  defaultValues,
}: {
  action: ActionFn;
  accounts: AccountOption[];
  holdings: HoldingOption[];
  defaultValues?: DividendDefaults;
}) {
  const [state, formAction] = useActionState(action, { error: null });
  const [pending, startTransition] = useTransition();
  const [fxError, setFxError] = useState<string | null>(null);
  const [fxLoading, startFxFetch] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<DividendFormValues, unknown, DividendFormOutput>({
    resolver: zodResolver(dividendFormSchema),
    defaultValues: {
      accountId: defaultValues?.accountId ?? "",
      holdingId: defaultValues?.holdingId ?? "",
      symbol: defaultValues?.symbol ?? "",
      dividendDate: dateInputValue(defaultValues?.dividendDate),
      exDividendDate: dateInputValue(defaultValues?.exDividendDate),
      amountPerShare: toNumber(defaultValues?.amountPerShare, 0),
      quantity: toNumber(defaultValues?.quantity, 0),
      totalAmount:
        defaultValues?.totalAmount == null
          ? undefined
          : toNumber(defaultValues.totalAmount, 0),
      taxAmount: toNumber(defaultValues?.taxAmount, 0),
      isTaxOverridden: defaultValues?.isTaxOverridden ? "true" : "false",
      currency: defaultValues?.currency ?? "KRW",
      fxRate: toNumber(defaultValues?.fxRate, 1),
      notes: defaultValues?.notes ?? "",
    },
  });

  const accountId = watch("accountId");
  const currency = watch("currency");
  const taxOverrideRaw = watch("isTaxOverridden");
  const taxOverride = taxOverrideRaw === "on" || taxOverrideRaw === "true";

  const accountHoldings = accountId
    ? holdings.filter((h) => h.accountId === accountId)
    : holdings;

  function fetchFx(next: string) {
    setFxError(null);
    if (next === "KRW") {
      setValue("fxRate", 1, { shouldDirty: true });
      return;
    }
    startFxFetch(async () => {
      const result = await getFxRateAction(next as Currency);
      if (result.ok) {
        setValue("fxRate", result.rate, { shouldDirty: true });
      } else {
        setFxError(result.error);
      }
    });
  }

  function handleCurrencyChange(next: string) {
    setValue("currency", next as DividendFormValues["currency"], { shouldDirty: true });
    fetchFx(next);
  }

  function handleHoldingChange(id: string) {
    setValue("holdingId", id, { shouldDirty: true });
    if (!id) return;
    const h = holdings.find((x) => x.id === id);
    if (!h) return;
    setValue("accountId", h.accountId, { shouldDirty: true });
    setValue("symbol", h.symbol ?? "", { shouldDirty: true });
    setValue("quantity", toNumber(h.quantity, 0), { shouldDirty: true });
    if (h.currency !== getValues("currency")) handleCurrencyChange(h.currency);
  }

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set("accountId", data.accountId);
    fd.set("holdingId", data.holdingId ?? "");
    fd.set("symbol", data.symbol ?? "");
    fd.set("dividendDate", data.dividendDate);
    fd.set("exDividendDate", data.exDividendDate ?? "");
    fd.set("amountPerShare", String(data.amountPerShare));
    fd.set("quantity", String(data.quantity));
    if (data.totalAmount !== undefined) {
      fd.set("totalAmount", String(data.totalAmount));
    }
    fd.set("isTaxOverridden", data.isTaxOverridden ? "true" : "false");
    if (data.isTaxOverridden && data.taxAmount !== undefined) {
      fd.set("taxAmount", String(data.taxAmount));
    }
    fd.set("currency", data.currency);
    fd.set("fxRate", String(data.fxRate));
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
          <Label htmlFor="accountId">계좌 *</Label>
          <Select id="accountId" {...register("accountId")}>
            <option value="">계좌 선택...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.institution ? ` (${a.institution})` : ""}
              </option>
            ))}
          </Select>
          {errors.accountId && (
            <p className="text-xs text-destructive">{errors.accountId.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="holdingId">보유종목 (선택)</Label>
          <Select
            id="holdingId"
            {...register("holdingId")}
            onChange={(e) => handleHoldingChange(e.target.value)}
          >
            <option value="">선택 안 함</option>
            {accountHoldings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.symbol ? ` · ${h.symbol}` : ""}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            선택하면 심볼·통화·수량이 자동 채워집니다.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="symbol">티커 / 코드</Label>
          <Input id="symbol" placeholder="예: AAPL" {...register("symbol")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dividendDate">지급일 *</Label>
          <Input id="dividendDate" type="date" {...register("dividendDate")} />
          {errors.dividendDate && (
            <p className="text-xs text-destructive">{errors.dividendDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="exDividendDate">배당락일</Label>
          <Input id="exDividendDate" type="date" {...register("exDividendDate")} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="amountPerShare">주당 배당금 *</Label>
          <Input
            id="amountPerShare"
            type="number"
            step="0.000001"
            placeholder="0"
            {...register("amountPerShare")}
          />
          {errors.amountPerShare && (
            <p className="text-xs text-destructive">{errors.amountPerShare.message}</p>
          )}
        </div>
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
          <Label htmlFor="totalAmount">세전 총액 (선택)</Label>
          <Input
            id="totalAmount"
            type="number"
            step="0.0001"
            placeholder="자동 = 주당 × 수량"
            {...register("totalAmount")}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency">통화</Label>
          <Select
            id="currency"
            {...register("currency")}
            onChange={(e) => handleCurrencyChange(e.target.value)}
          >
            {CURRENCIES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="fxRate">환율 (원화 기준)</Label>
            {currency !== "KRW" && (
              <button
                type="button"
                onClick={() => fetchFx(currency)}
                disabled={fxLoading}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                title="최근 환율 다시 가져오기"
              >
                <RefreshCw className={`h-3 w-3 ${fxLoading ? "animate-spin" : ""}`} />
                새로고침
              </button>
            )}
          </div>
          <Input
            id="fxRate"
            type="number"
            step="0.00000001"
            placeholder="1"
            disabled={fxLoading}
            {...register("fxRate")}
          />
          {errors.fxRate && (
            <p className="text-xs text-destructive">{errors.fxRate.message}</p>
          )}
          {fxError && <p className="text-xs text-destructive">{fxError}</p>}
          {currency !== "KRW" && !fxError && !errors.fxRate && (
            <p className="text-xs text-muted-foreground">
              통화 선택 시 자동 채움. 직접 수정 가능.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            value="true"
            checked={taxOverride}
            onChange={(e) =>
              setValue("isTaxOverridden", e.target.checked ? "true" : "false", {
                shouldDirty: true,
              })
            }
            className="h-4 w-4 rounded border-input"
          />
          세금을 직접 입력 (체크 안 하면 계좌·통화 기준으로 자동 계산)
        </label>
        {taxOverride && (
          <div className="space-y-2 pt-2">
            <Label htmlFor="taxAmount">원천징수 세액</Label>
            <Input
              id="taxAmount"
              type="number"
              step="0.0001"
              placeholder="0"
              {...register("taxAmount")}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          자동 적용 기준: 절세계좌 0% / 국내(KRW) 15.4% / 해외 15%
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
