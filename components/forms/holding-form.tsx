"use client";

import { useActionState, useState, useTransition } from "react";
import { Search } from "lucide-react";
import type { Holding } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { HoldingActionState } from "@/app/actions/holdings";
import { lookupSymbolAction } from "@/app/actions/symbols";
import { ASSET_CLASSES, CURRENCIES } from "@/lib/labels";

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

export function HoldingForm({
  action,
  accounts,
  defaultValues,
  defaultAccountId
}: {
  action: ActionFn;
  accounts: AccountOption[];
  defaultValues?: HoldingDefaults;
  defaultAccountId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [name, setName] = useState<string>(defaultValues?.name ?? "");
  const [symbol, setSymbol] = useState<string>(defaultValues?.symbol ?? "");
  const [currency, setCurrency] = useState<string>(defaultValues?.currency ?? "KRW");
  const [lookupPending, startLookup] = useTransition();
  const [lookupMessage, setLookupMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  function handleLookup() {
    const input = symbol.trim();
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
      setSymbol(r.data.symbol);
      setCurrency(r.data.currency);
      if (!name.trim()) setName(r.data.name);
      setLookupMessage({
        kind: "success",
        text: `${r.data.symbol} · ${r.data.name} · ${r.data.currency} ${r.data.price.toLocaleString()}`
      });
    });
  }

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
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="symbol">티커 / 코드</Label>
          <div className="flex gap-2">
            <Input
              id="symbol"
              name="symbol"
              placeholder="예: AAPL, 005930, 035720"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="flex-1"
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
          <Select
            id="currency"
            name="currency"
            value={currency}
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
