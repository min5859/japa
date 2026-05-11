"use server";

import { revalidatePath } from "next/cache";
import { Prisma, AccountType, AssetClass, Currency, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DataActionState = { error: string | null; message: string | null };

const INITIAL_STATE: DataActionState = { error: null, message: null };

// RFC 4180 호환 미니 파서 — 따옴표 escape("")·CRLF·LF·콤마/개행 포함 필드 처리.
function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
    } else if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ",") {
      row.push(field);
      field = "";
      i++;
    } else if (c === "\r") {
      if (text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else {
      field += c;
      i++;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function toRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] ?? "";
    });
    return obj;
  });
}

function parseBool(s: string): boolean {
  return s === "true" || s === "TRUE" || s === "1";
}

function parseDateOrNull(s: string): Date | null {
  if (!s) return null;
  // "YYYY-MM-DD" 는 UTC 자정으로 고정해 TZ shift 회피.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00.000Z`);
  return new Date(s);
}

function reqDate(s: string): Date {
  const d = parseDateOrNull(s);
  if (!d) throw new Error(`날짜 필드가 비어있습니다: "${s}"`);
  return d;
}

function parseDecimalOrNull(s: string): Prisma.Decimal | null {
  if (s === "" || s == null) return null;
  return new Prisma.Decimal(s);
}

function reqDecimal(s: string): Prisma.Decimal {
  if (s === "" || s == null) throw new Error("필수 숫자 필드가 비어있습니다");
  return new Prisma.Decimal(s);
}

// enum 캐스팅 — 잘못된 값이면 명시적 에러로 끊는다.
function asEnum<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`${label}: 허용되지 않은 값 "${value}"`);
}

const ACCOUNT_TYPES = Object.values(AccountType) as AccountType[];
const ASSET_CLASSES = Object.values(AssetClass) as AssetClass[];
const CURRENCIES = Object.values(Currency) as Currency[];
const TX_TYPES = Object.values(TransactionType) as TransactionType[];

/**
 * 계좌 도메인 전체 초기화 — Account/AccountGroup/Holding/Transaction/Dividend 5개 테이블 비움.
 * 시장 시세 캐시·AI 분석·채팅·스냅샷은 손대지 않는다.
 * 사용자가 UI 에서 "RESET" 텍스트를 입력해 확인한 경우에만 호출되어야 한다.
 */
export async function resetAccountData(
  _prevState: DataActionState,
  formData: FormData
): Promise<DataActionState> {
  const confirm = (formData.get("confirm") as string | null) ?? "";
  if (confirm !== "RESET") {
    return { error: "확인 문자열 \"RESET\" 을 정확히 입력해야 합니다.", message: null };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const transactions = await tx.transaction.deleteMany();
      const dividends = await tx.dividend.deleteMany();
      const holdings = await tx.holding.deleteMany();
      // Account 삭제 시 N:M 조인은 Prisma 가 자동 정리.
      const accounts = await tx.account.deleteMany();
      const groups = await tx.accountGroup.deleteMany();
      return { transactions, dividends, holdings, accounts, groups };
    });

    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/groups");
    revalidatePath("/holdings");
    revalidatePath("/dividends");
    revalidatePath("/settings/data");

    return {
      error: null,
      message:
        `초기화 완료 — accounts ${result.accounts.count}, groups ${result.groups.count}, ` +
        `holdings ${result.holdings.count}, transactions ${result.transactions.count}, ` +
        `dividends ${result.dividends.count}`
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "초기화 중 오류가 발생했습니다.",
      message: null
    };
  }
}

type CsvFile = File | null | undefined;

async function readText(file: CsvFile): Promise<string | null> {
  if (!file || typeof file === "string") return null;
  if (file.size === 0) return null;
  return await file.text();
}

/**
 * 5개 CSV (accounts/groups/holdings/transactions/dividends) 를 의존성 순서로 import.
 * ID 는 CSV 값을 그대로 사용 — export 직후 round-trip 시 외래키 정합성 유지.
 * @updatedAt 필드는 Prisma 가 자동 설정하므로 CSV 의 updatedAt 은 무시한다.
 */
export async function importAccountData(
  _prevState: DataActionState,
  formData: FormData
): Promise<DataActionState> {
  const accountsText = await readText(formData.get("accounts") as CsvFile);
  const groupsText = await readText(formData.get("groups") as CsvFile);
  const holdingsText = await readText(formData.get("holdings") as CsvFile);
  const transactionsText = await readText(formData.get("transactions") as CsvFile);
  const dividendsText = await readText(formData.get("dividends") as CsvFile);

  if (!accountsText && !groupsText && !holdingsText && !transactionsText && !dividendsText) {
    return { error: "최소 한 개 CSV 를 선택해야 합니다.", message: null };
  }

  try {
    type AccountRow = { id: string; name: string; institution: string | null; type: AccountType; currency: Currency; cashBalance: Prisma.Decimal; isTaxAdvantaged: boolean; annualContributionLimit: Prisma.Decimal | null; contributionYTD: Prisma.Decimal; notes: string | null; createdAt: Date };
    type GroupRow = { id: string; name: string; description: string | null; displayOrder: number; createdAt: Date; accountIds: string[] };
    type HoldingRow = { id: string; accountId: string; symbol: string | null; name: string; assetClass: AssetClass; currency: Currency; quantity: Prisma.Decimal; averageCost: Prisma.Decimal; manualPrice: Prisma.Decimal; manualFxRate: Prisma.Decimal; dividendYield: Prisma.Decimal | null; notes: string | null; createdAt: Date };
    type TxRow = { id: string; accountId: string; holdingId: string; type: TransactionType; tradeDate: Date; quantity: Prisma.Decimal; pricePerShare: Prisma.Decimal; fee: Prisma.Decimal; currency: Currency; fxRate: Prisma.Decimal; realizedGain: Prisma.Decimal | null; cashAdjusted: boolean; notes: string | null; createdAt: Date };
    type DivRow = { id: string; accountId: string; holdingId: string | null; symbol: string | null; dividendDate: Date; exDividendDate: Date | null; amountPerShare: Prisma.Decimal; quantity: Prisma.Decimal; totalAmount: Prisma.Decimal; taxAmount: Prisma.Decimal; netAmount: Prisma.Decimal; currency: Currency; fxRate: Prisma.Decimal; isTaxOverridden: boolean; notes: string | null; createdAt: Date };

    const accounts: AccountRow[] = [];
    if (accountsText) {
      for (const r of toRecords(accountsText)) {
        accounts.push({
          id: r.id,
          name: r.name,
          institution: r.institution || null,
          type: asEnum(r.type, ACCOUNT_TYPES, "Account.type"),
          currency: asEnum(r.currency, CURRENCIES, "Account.currency"),
          cashBalance: reqDecimal(r.cashBalance || "0"),
          isTaxAdvantaged: parseBool(r.isTaxAdvantaged),
          annualContributionLimit: parseDecimalOrNull(r.annualContributionLimit),
          contributionYTD: reqDecimal(r.contributionYTD || "0"),
          notes: r.notes || null,
          createdAt: reqDate(r.createdAt)
        });
      }
    }

    const groups: GroupRow[] = [];
    if (groupsText) {
      for (const r of toRecords(groupsText)) {
        groups.push({
          id: r.id,
          name: r.name,
          description: r.description || null,
          displayOrder: Number(r.displayOrder || "0"),
          createdAt: reqDate(r.createdAt),
          accountIds: r.accountIds ? r.accountIds.split(";").filter(Boolean) : []
        });
      }
    }

    const holdings: HoldingRow[] = [];
    if (holdingsText) {
      for (const r of toRecords(holdingsText)) {
        holdings.push({
          id: r.id,
          accountId: r.accountId,
          symbol: r.symbol || null,
          name: r.name,
          assetClass: asEnum(r.assetClass, ASSET_CLASSES, "Holding.assetClass"),
          currency: asEnum(r.currency, CURRENCIES, "Holding.currency"),
          quantity: reqDecimal(r.quantity || "0"),
          averageCost: reqDecimal(r.averageCost || "0"),
          manualPrice: reqDecimal(r.manualPrice || "0"),
          manualFxRate: reqDecimal(r.manualFxRate || "1"),
          dividendYield: parseDecimalOrNull(r.dividendYield),
          notes: r.notes || null,
          createdAt: reqDate(r.createdAt)
        });
      }
    }

    const txs: TxRow[] = [];
    if (transactionsText) {
      for (const r of toRecords(transactionsText)) {
        txs.push({
          id: r.id,
          accountId: r.accountId,
          holdingId: r.holdingId,
          type: asEnum(r.type, TX_TYPES, "Transaction.type"),
          tradeDate: reqDate(r.tradeDate),
          quantity: reqDecimal(r.quantity),
          pricePerShare: reqDecimal(r.pricePerShare),
          fee: reqDecimal(r.fee || "0"),
          currency: asEnum(r.currency, CURRENCIES, "Transaction.currency"),
          fxRate: reqDecimal(r.fxRate || "1"),
          realizedGain: parseDecimalOrNull(r.realizedGain),
          cashAdjusted: parseBool(r.cashAdjusted),
          notes: r.notes || null,
          createdAt: reqDate(r.createdAt)
        });
      }
    }

    const divs: DivRow[] = [];
    if (dividendsText) {
      for (const r of toRecords(dividendsText)) {
        divs.push({
          id: r.id,
          accountId: r.accountId,
          holdingId: r.holdingId || null,
          symbol: r.symbol || null,
          dividendDate: reqDate(r.dividendDate),
          exDividendDate: parseDateOrNull(r.exDividendDate),
          amountPerShare: reqDecimal(r.amountPerShare),
          quantity: reqDecimal(r.quantity),
          totalAmount: reqDecimal(r.totalAmount),
          taxAmount: reqDecimal(r.taxAmount || "0"),
          netAmount: reqDecimal(r.netAmount),
          currency: asEnum(r.currency, CURRENCIES, "Dividend.currency"),
          fxRate: reqDecimal(r.fxRate || "1"),
          isTaxOverridden: parseBool(r.isTaxOverridden),
          notes: r.notes || null,
          createdAt: reqDate(r.createdAt)
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const g = groups.length
        ? await tx.accountGroup.createMany({
            data: groups.map(({ accountIds: _accountIds, ...rest }) => rest)
          })
        : { count: 0 };

      const a = accounts.length
        ? await tx.account.createMany({ data: accounts })
        : { count: 0 };

      // AccountGroup ↔ Account N:M 매핑 복원. createMany 가 relation connect 를
      // 지원하지 않아 group 별 update 로 처리한다.
      for (const grp of groups) {
        if (grp.accountIds.length === 0) continue;
        await tx.accountGroup.update({
          where: { id: grp.id },
          data: { accounts: { connect: grp.accountIds.map((id) => ({ id })) } }
        });
      }

      const h = holdings.length
        ? await tx.holding.createMany({ data: holdings })
        : { count: 0 };

      const t = txs.length
        ? await tx.transaction.createMany({ data: txs })
        : { count: 0 };

      const d = divs.length
        ? await tx.dividend.createMany({ data: divs })
        : { count: 0 };

      return { groups: g, accounts: a, holdings: h, transactions: t, dividends: d };
    });

    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/groups");
    revalidatePath("/holdings");
    revalidatePath("/dividends");
    revalidatePath("/settings/data");

    return {
      error: null,
      message:
        `Import 완료 — accounts ${result.accounts.count}, groups ${result.groups.count}, ` +
        `holdings ${result.holdings.count}, transactions ${result.transactions.count}, ` +
        `dividends ${result.dividends.count}`
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Import 중 오류가 발생했습니다.",
      message: null
    };
  }
}

export { INITIAL_STATE as INITIAL_DATA_STATE };
