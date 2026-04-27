// Plan Ref: §5 — 거래 입력 폼 (생성·편집 겸용)

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  MARKETS,
  MARKET_LABELS,
  CURRENCIES,
  type Transaction,
  type TransactionFormInput,
  type TransactionType,
  type Market,
} from "@/lib/transactions/schema";
import { createTransaction, updateTransaction } from "./actions";

type Props = {
  accountId: string;
  defaultCurrency: string;
  // 편집 모드
  transaction?: Transaction;
  defaultTicker?: string;
  defaultMarket?: Market;
  defaultName?: string | null;
};

export function TransactionForm({
  accountId,
  defaultCurrency,
  transaction,
  defaultTicker,
  defaultMarket,
  defaultName,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<TransactionType>(transaction?.type ?? "buy");
  const isTrade = type === "buy" || type === "sell";

  const today = new Date().toISOString().slice(0, 10);

  // amount(체결총액) 자동 계산: 매수/매도일 때 quantity × price를 자동으로 채운다.
  // 사용자가 amount를 직접 수정하면(amountTouched=true) 자동 갱신을 멈춘다.
  // 편집 모드(transaction 존재)는 기존값 보존을 위해 처음부터 touched=true.
  const [quantity, setQuantity] = useState<string>(
    transaction?.quantity != null ? String(transaction.quantity) : "",
  );
  const [price, setPrice] = useState<string>(
    transaction?.price != null ? String(transaction.price) : "",
  );
  const [amount, setAmount] = useState<string>(
    transaction?.amount != null ? String(transaction.amount) : "",
  );
  const [amountTouched, setAmountTouched] = useState<boolean>(transaction != null);

  function recalcAmount(q: string, p: string) {
    const qn = Number(q);
    const pn = Number(p);
    if (Number.isFinite(qn) && Number.isFinite(pn) && qn > 0 && pn > 0) {
      // numeric(20,2) → 소수 둘째 자리까지
      setAmount((qn * pn).toFixed(2));
    }
  }

  function handleTypeChange(t: TransactionType) {
    setType(t);
    // 신규 입력에서 매수/매도 ↔ 배당/이자/수수료 전환 시 amount 자동계산을 다시 켠다.
    if (!transaction) {
      setAmountTouched(false);
      const willBeTrade = t === "buy" || t === "sell";
      if (willBeTrade) {
        recalcAmount(quantity, price);
      } else {
        setAmount("");
      }
    }
  }

  function handleQuantityChange(v: string) {
    setQuantity(v);
    if (isTrade && !amountTouched) recalcAmount(v, price);
  }

  function handlePriceChange(v: string) {
    setPrice(v);
    if (isTrade && !amountTouched) recalcAmount(quantity, v);
  }

  function handleAmountChange(v: string) {
    setAmount(v);
    setAmountTouched(true);
  }

  function handleSubmit(formData: FormData) {
    setError(null);

    const input: TransactionFormInput = {
      type,
      ticker: (formData.get("ticker") as string) || "",
      market: (formData.get("market") as Market) || undefined,
      name: (formData.get("name") as string) || "",
      quantity: (formData.get("quantity") as string) || "",
      price: (formData.get("price") as string) || "",
      amount: (formData.get("amount") as string) || "0",
      fee: (formData.get("fee") as string) || "0",
      tax_withheld: (formData.get("tax_withheld") as string) || "0",
      currency: (formData.get("currency") as (typeof CURRENCIES)[number]) ?? defaultCurrency,
      trade_date: (formData.get("trade_date") as string) || today,
      memo: (formData.get("memo") as string) || "",
    };

    startTransition(async () => {
      const result = transaction
        ? await updateTransaction(accountId, transaction.id, input)
        : await createTransaction(accountId, input);
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* 거래 유형 */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          거래 유형
        </label>
        <div className="flex flex-wrap gap-2">
          {TRANSACTION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={
                "rounded-md border px-3 py-1.5 text-sm font-medium transition " +
                (type === t
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800")
              }
            >
              {TRANSACTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 거래일 + 통화 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="trade_date" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            거래일
          </label>
          <input
            id="trade_date"
            name="trade_date"
            type="date"
            required
            max={today}
            defaultValue={transaction?.trade_date ?? today}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="currency" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            통화
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={transaction?.currency ?? defaultCurrency}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 매수·매도 전용 필드 */}
      {isTrade && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ticker" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                티커 <span className="text-xs text-gray-500">(예: AAPL, 005930)</span>
              </label>
              <input
                id="ticker"
                name="ticker"
                type="text"
                required
                maxLength={30}
                defaultValue={transaction?.ticker ?? defaultTicker ?? ""}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                placeholder="AAPL"
              />
            </div>
            <div>
              <label htmlFor="market" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                시장
              </label>
              <select
                id="market"
                name="market"
                defaultValue={defaultMarket ?? "US"}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                {MARKETS.map((m) => (
                  <option key={m} value={m}>
                    {MARKET_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              종목명 <span className="text-xs text-gray-500">(선택)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              maxLength={100}
              defaultValue={transaction?.name ?? defaultName ?? ""}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              placeholder="Apple Inc."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="quantity" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                수량
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                step="0.0001"
                min="0"
                required
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label htmlFor="price" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                단가
              </label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.0001"
                min="0"
                required
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </>
      )}

      {/* 금액·수수료·세금 */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="amount" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            금액{" "}
            <span className="text-xs text-gray-500">
              {isTrade
                ? amountTouched
                  ? "(직접 입력됨)"
                  : "(자동 계산, 수정 가능)"
                : "(필수)"}
            </span>
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="fee" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            수수료
          </label>
          <input
            id="fee"
            name="fee"
            type="number"
            step="0.01"
            min="0"
            defaultValue={transaction?.fee ?? "0"}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="tax_withheld" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            원천징수세
          </label>
          <input
            id="tax_withheld"
            name="tax_withheld"
            type="number"
            step="0.01"
            min="0"
            defaultValue={transaction?.tax_withheld ?? "0"}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* 메모 */}
      <div>
        <label htmlFor="memo" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          메모 <span className="text-xs text-gray-500">(선택)</span>
        </label>
        <input
          id="memo"
          name="memo"
          type="text"
          maxLength={500}
          defaultValue={transaction?.memo ?? ""}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "저장 중..." : transaction ? "거래 수정" : "거래 추가"}
        </button>
      </div>
    </form>
  );
}
