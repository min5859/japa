"use client";

import { useActionState, useState } from "react";
import type { Dividend } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DividendActionState } from "@/app/actions/dividends";
import { CURRENCIES } from "@/lib/labels";

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
  "amountPerShare" | "quantity" | "totalAmount" | "taxAmount" | "fxRate" | "dividendDate" | "exDividendDate"
> & {
  amountPerShare?: number | string | null;
  quantity?: number | string | null;
  totalAmount?: number | string | null;
  taxAmount?: number | string | null;
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

export function DividendForm({
  action,
  accounts,
  holdings,
  defaultValues
}: {
  action: ActionFn;
  accounts: AccountOption[];
  holdings: HoldingOption[];
  defaultValues?: DividendDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [accountId, setAccountId] = useState<string>(defaultValues?.accountId ?? "");
  const [holdingId, setHoldingId] = useState<string>(defaultValues?.holdingId ?? "");
  const [symbol, setSymbol] = useState<string>(defaultValues?.symbol ?? "");
  const [currency, setCurrency] = useState<string>(defaultValues?.currency ?? "KRW");
  const [quantity, setQuantity] = useState<string>(
    defaultValues?.quantity?.toString() ?? "0"
  );
  const [taxOverride, setTaxOverride] = useState<boolean>(
    defaultValues?.isTaxOverridden ?? false
  );

  const accountHoldings = accountId
    ? holdings.filter((h) => h.accountId === accountId)
    : holdings;

  function handleHoldingChange(id: string) {
    setHoldingId(id);
    if (!id) return;
    const h = holdings.find((x) => x.id === id);
    if (!h) return;
    setAccountId(h.accountId);
    setSymbol(h.symbol ?? "");
    setCurrency(h.currency);
    setQuantity(h.quantity);
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="accountId">계좌 *</Label>
          <Select
            id="accountId"
            name="accountId"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            <option value="">계좌 선택...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.institution ? ` (${a.institution})` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="holdingId">보유종목 (선택)</Label>
          <Select
            id="holdingId"
            name="holdingId"
            value={holdingId}
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
          <Input
            id="symbol"
            name="symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="예: AAPL"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dividendDate">지급일 *</Label>
          <Input
            id="dividendDate"
            name="dividendDate"
            type="date"
            defaultValue={dateInputValue(defaultValues?.dividendDate)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exDividendDate">배당락일</Label>
          <Input
            id="exDividendDate"
            name="exDividendDate"
            type="date"
            defaultValue={dateInputValue(defaultValues?.exDividendDate)}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="amountPerShare">주당 배당금 *</Label>
          <Input
            id="amountPerShare"
            name="amountPerShare"
            type="number"
            step="0.000001"
            placeholder="0"
            defaultValue={defaultValues?.amountPerShare?.toString() ?? "0"}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">수량 *</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="0.00000001"
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalAmount">세전 총액 (선택)</Label>
          <Input
            id="totalAmount"
            name="totalAmount"
            type="number"
            step="0.0001"
            placeholder="자동 = 주당 × 수량"
            defaultValue={defaultValues?.totalAmount?.toString() ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency">통화</Label>
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
        <div className="space-y-2">
          <Label htmlFor="fxRate">환율 (원화 기준)</Label>
          <Input
            id="fxRate"
            name="fxRate"
            type="number"
            step="0.00000001"
            placeholder="1"
            defaultValue={defaultValues?.fxRate?.toString() ?? "1"}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="isTaxOverridden"
            checked={taxOverride}
            onChange={(e) => setTaxOverride(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          세금을 직접 입력 (체크 안 하면 계좌·통화 기준으로 자동 계산)
        </label>
        {taxOverride && (
          <div className="space-y-2 pt-2">
            <Label htmlFor="taxAmount">원천징수 세액</Label>
            <Input
              id="taxAmount"
              name="taxAmount"
              type="number"
              step="0.0001"
              placeholder="0"
              defaultValue={defaultValues?.taxAmount?.toString() ?? "0"}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          자동 적용 기준: 절세계좌 0% / 국내(KRW) 15.4% / 해외 15%
        </p>
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
