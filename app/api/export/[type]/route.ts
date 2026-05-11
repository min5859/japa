import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = typeof value === "string" ? value : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRows(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  // Excel-friendly UTF-8 BOM keeps Korean text readable
  return "﻿" + lines.join("\r\n") + "\r\n";
}

type CsvExport = {
  headers: string[];
  build: () => Promise<unknown[][]>;
};

const EXPORTS: Record<string, CsvExport> = {
  accounts: {
    headers: [
      "id", "name", "institution", "type", "currency",
      "cashBalance", "isTaxAdvantaged", "annualContributionLimit",
      "contributionYTD", "notes", "createdAt", "updatedAt"
    ],
    build: async () => {
      const rows = await prisma.account.findMany({ orderBy: { name: "asc" } });
      return rows.map((a) => [
        a.id, a.name, a.institution ?? "", a.type, a.currency,
        toNumber(a.cashBalance), a.isTaxAdvantaged,
        a.annualContributionLimit != null ? toNumber(a.annualContributionLimit) : "",
        toNumber(a.contributionYTD), a.notes ?? "",
        a.createdAt.toISOString(), a.updatedAt.toISOString()
      ]);
    }
  },

  // accountIds는 N:M 관계를 ;-구분 cuid 목록으로 직렬화 — 단일 CSV로 round-trip.
  groups: {
    headers: [
      "id", "name", "description", "displayOrder",
      "accountIds", "createdAt", "updatedAt"
    ],
    build: async () => {
      const rows = await prisma.accountGroup.findMany({
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: { accounts: { select: { id: true } } }
      });
      return rows.map((g) => [
        g.id, g.name, g.description ?? "", g.displayOrder,
        g.accounts.map((a) => a.id).join(";"),
        g.createdAt.toISOString(), g.updatedAt.toISOString()
      ]);
    }
  },

  holdings: {
    headers: [
      "id", "accountId", "accountName", "name", "symbol", "assetClass", "currency",
      "quantity", "averageCost", "manualPrice", "manualFxRate",
      "dividendYield", "notes", "createdAt", "updatedAt"
    ],
    build: async () => {
      const rows = await prisma.holding.findMany({
        orderBy: [{ assetClass: "asc" }, { name: "asc" }],
        include: { account: { select: { name: true } } }
      });
      return rows.map((h) => [
        h.id, h.accountId, h.account.name, h.name, h.symbol ?? "", h.assetClass, h.currency,
        toNumber(h.quantity), toNumber(h.averageCost),
        toNumber(h.manualPrice), toNumber(h.manualFxRate),
        h.dividendYield != null ? toNumber(h.dividendYield) : "",
        h.notes ?? "", h.createdAt.toISOString(), h.updatedAt.toISOString()
      ]);
    }
  },

  transactions: {
    headers: [
      "id", "accountId", "holdingId", "type", "tradeDate",
      "quantity", "pricePerShare", "fee", "currency", "fxRate",
      "realizedGain", "cashAdjusted", "notes", "createdAt"
    ],
    build: async () => {
      const rows = await prisma.transaction.findMany({
        orderBy: { tradeDate: "asc" }
      });
      return rows.map((t) => [
        t.id, t.accountId, t.holdingId, t.type,
        t.tradeDate.toISOString().slice(0, 10),
        toNumber(t.quantity), toNumber(t.pricePerShare), toNumber(t.fee),
        t.currency, toNumber(t.fxRate),
        t.realizedGain != null ? toNumber(t.realizedGain) : "",
        t.cashAdjusted, t.notes ?? "",
        t.createdAt.toISOString()
      ]);
    }
  },

  dividends: {
    headers: [
      "id", "accountId", "holdingId", "dividendDate", "exDividendDate",
      "accountName", "holdingName",
      "symbol", "amountPerShare", "quantity", "totalAmount", "taxAmount",
      "netAmount", "currency", "fxRate", "isTaxOverridden", "notes",
      "createdAt", "updatedAt"
    ],
    build: async () => {
      const rows = await prisma.dividend.findMany({
        orderBy: { dividendDate: "desc" },
        include: {
          account: { select: { name: true } },
          holding: { select: { name: true } }
        }
      });
      return rows.map((d) => [
        d.id, d.accountId, d.holdingId ?? "",
        d.dividendDate.toISOString().slice(0, 10),
        d.exDividendDate ? d.exDividendDate.toISOString().slice(0, 10) : "",
        d.account.name,
        d.holding?.name ?? "",
        d.symbol ?? "",
        toNumber(d.amountPerShare),
        toNumber(d.quantity),
        toNumber(d.totalAmount),
        toNumber(d.taxAmount),
        toNumber(d.netAmount),
        d.currency,
        toNumber(d.fxRate),
        d.isTaxOverridden,
        d.notes ?? "",
        d.createdAt.toISOString(),
        d.updatedAt.toISOString()
      ]);
    }
  },

  snapshots: {
    headers: ["takenAt", "netWorth", "totalAssets", "cash", "investments", "liabilities", "allocation"],
    build: async () => {
      const rows = await prisma.portfolioSnapshot.findMany({ orderBy: { takenAt: "asc" } });
      return rows.map((s) => [
        s.takenAt.toISOString(),
        toNumber(s.netWorth), toNumber(s.totalAssets),
        toNumber(s.cash), toNumber(s.investments), toNumber(s.liabilities),
        JSON.stringify(s.allocation)
      ]);
    }
  }
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const config = EXPORTS[type];
  if (!config) {
    return NextResponse.json({ error: "unknown export type" }, { status: 404 });
  }

  const csv = csvRows(config.headers, await config.build());

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="japa-${type}-${stamp}.csv"`
    }
  });
}
