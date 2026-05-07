"use client";

import { useActionState, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Search } from "lucide-react";
import type { Holding } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { HoldingActionState } from "@/app/actions/holdings";
import { lookupSymbolAction } from "@/app/actions/symbols";
import { ASSET_CLASSES, holdingFormSchema } from "@/lib/holdings/schema";
import { CURRENCIES } from "@/lib/labels";

type HoldingFormValues = z.input<typeof holdingFormSchema>;
type HoldingFormOutput = z.output<typeof holdingFormSchema>;

type AccountOption = { id: string; name: string; institution: string | null };
type ActionFn = (state: HoldingActionState, formData: FormData) => Promise<HoldingActionState>;

export type HoldingDefaults = Omit<
  Partial<Holding>,
  "quantity" | "averageCost" | "manualPrice" | "manualFxRate" | "dividendYield"
> & {
  quantity?: number | string | null;
  averageCost?: number | string | null;
  manualPrice?: number | string | null;
  manualFxRate?: number | string | null;
  dividendYield?: number | string | null;
};

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function HoldingForm({
  action,
  accounts,
  defaultValues,
  defaultAccountId,
}: {
  action: ActionFn;
  accounts: AccountOption[];
  defaultValues?: HoldingDefaults;
  defaultAccountId?: string;
}) {
  const [state, formAction] = useActionState(action, { error: null });
  const [pending, startTransition] = useTransition();
  const [lookupPending, startLookup] = useTransition();
  const [lookupMessage, setLookupMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<HoldingFormValues, unknown, HoldingFormOutput>({
    resolver: zodResolver(holdingFormSchema),
    defaultValues: {
      accountId: defaultValues?.accountId ?? defaultAccountId ?? "",
      name: defaultValues?.name ?? "",
      symbol: defaultValues?.symbol ?? "",
      assetClass: defaultValues?.assetClass ?? "ETF",
      currency: defaultValues?.currency ?? "KRW",
      quantity: toNumber(defaultValues?.quantity, 0),
      averageCost: toNumber(defaultValues?.averageCost, 0),
      manualPrice: toNumber(defaultValues?.manualPrice, 0),
      manualFxRate: toNumber(defaultValues?.manualFxRate, 1),
      dividendYield:
        defaultValues?.dividendYield == null
          ? null
          : toNumber(defaultValues.dividendYield, 0),
      notes: defaultValues?.notes ?? "",
    },
  });

  function handleLookup() {
    const input = (getValues("symbol") ?? "").trim();
    if (!input) {
      setLookupMessage({ kind: "error", text: "티커를 먼저 입력하세요." });
      return;
    }
    setLookupMessage(null);
    startLookup(async () => {
      const r = await lookupSymbolAction(input);
      if (!r.ok) {
        setLookupMessage({ kind: "error", text: r.error });
        return;
      }
      setValue("symbol", r.data.symbol, { shouldDirty: true });
      setValue("currency", r.data.currency as HoldingFormValues["currency"], {
        shouldDirty: true,
      });
      const currentName = (getValues("name") ?? "").trim();
      if (!currentName) setValue("name", r.data.name, { shouldDirty: true });
      setLookupMessage({
        kind: "success",
        text: `${r.data.symbol} · ${r.data.name} · ${r.data.currency} ${r.data.price.toLocaleString()}`,
      });
    });
  }

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set("accountId", data.accountId);
    fd.set("name", data.name);
    fd.set("symbol", data.symbol ?? "");
    fd.set("assetClass", data.assetClass);
    fd.set("currency", data.currency);
    fd.set("quantity", String(data.quantity));
    fd.set("averageCost", String(data.averageCost));
    fd.set("manualPrice", String(data.manualPrice));
    fd.set("manualFxRate", String(data.manualFxRate));
    if (data.dividendYield != null) {
      fd.set("dividendYield", String(data.dividendYield));
    }
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

      <div className="space-y-2">
        <Label htmlFor="accountId">계좌 *</Label>
        <Select id="accountId" {...register("accountId")}>
          <option value="">계좌 선택...</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}{a.institution ? ` (${a.institution})` : ""}
            </option>
          ))}
        </Select>
        {errors.accountId && (
          <p className="text-xs text-destructive">{errors.accountId.message}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">자산명 *</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="symbol">티커 / 코드</Label>
          <div className="flex gap-2">
            <Input
              id="symbol"
              placeholder="예: AAPL, 005930, 035720"
              className="flex-1"
              {...register("symbol")}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLookup}
              disabled={lookupPending}
              title="Yahoo Finance에서 자동 채우기"
            >
              <Search className={`h-4 w-4 ${lookupPending ? "animate-pulse" : ""}`} />
              <span className="ml-1 hidden sm:inline">
                {lookupPending ? "조회 중..." : "자동"}
              </span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            6자리 코드는 KOSPI/KOSDAQ 자동 판별 · 영문 티커는 Yahoo에 그대로 조회
          </p>
          {lookupMessage && (
            <p
              className={`text-xs ${
                lookupMessage.kind === "success"
                  ? "text-emerald-600"
                  : "text-destructive"
              }`}
            >
              {lookupMessage.text}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assetClass">자산 유형</Label>
          <Select id="assetClass" {...register("assetClass")}>
            {ASSET_CLASSES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">거래 통화</Label>
          <Select id="currency" {...register("currency")}>
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
            type="number"
            step="0.00000001"
            placeholder="0"
            {...register("quantity")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="averageCost">평균 매수가</Label>
          <Input
            id="averageCost"
            type="number"
            step="0.0001"
            placeholder="0"
            {...register("averageCost")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manualPrice">현재가 (수동)</Label>
          <Input
            id="manualPrice"
            type="number"
            step="0.0001"
            placeholder="0"
            {...register("manualPrice")}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="manualFxRate">환율 (원화 기준)</Label>
          <Input
            id="manualFxRate"
            type="number"
            step="0.00000001"
            placeholder="1"
            {...register("manualFxRate")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dividendYield">배당수익률 (%)</Label>
          <Input
            id="dividendYield"
            type="number"
            step="0.01"
            placeholder="선택사항"
            {...register("dividendYield")}
          />
        </div>
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
