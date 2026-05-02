import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ExportType = "accounts" | "holdings" | "snapshots" | "dividends";

const EXPORT_TYPES = new Set<ExportType>([
  "accounts",
  "holdings",
  "snapshots",
  "dividends"
]);

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

async function buildAccountsCsv(): Promise<string> {
  const rows = await prisma.account.findMany({ orderBy: { name: "asc" } });
  return csvRows(
    [
      "id", "name", "institution", "type", "currency",
      "cashBalance", "isTaxAdvantaged", "annualContributionLimit",
      "contributionYTD", "notes", "createdAt", "updatedAt"
    ],
    rows.map((a) => [
      a.id, a.name, a.institution ?? "", a.type, a.currency,
      toNumber(a.cashBalance), a.isTaxAdvantaged,
      a.annualContributionLimit != null ? toNumber(a.annualContributionLimit) : "",
      toNumber(a.contributionYTD), a.notes ?? "",
      a.createdAt.toISOString(), a.updatedAt.toISOString()
    ])
  );
}

async function buildHoldingsCsv(): Promise<string> {
  const rows = await prisma.holding.findMany({
    orderBy: [{ assetClass: "asc" }, { name: "asc" }],
    include: { account: { select: { name: true } } }
  });
  return csvRows(
    [
      "id", "accountName", "name", "symbol", "assetClass", "currency",
      "quantity", "averageCost", "manualPrice", "manualFxRate",
      "dividendYield", "notes", "createdAt", "updatedAt"
    ],
    rows.map((h) => [
      h.id, h.account.name, h.name, h.symbol ?? "", h.assetClass, h.currency,
      toNumber(h.quantity), toNumber(h.averageCost),
      toNumber(h.manualPrice), toNumber(h.manualFxRate),
      h.dividendYield != null ? toNumber(h.dividendYield) : "",
      h.notes ?? "", h.createdAt.toISOString(), h.updatedAt.toISOString()
    ])
  );
}

async function buildDividendsCsv(): Promise<string> {
  const rows = await prisma.dividend.findMany({
    orderBy: { dividendDate: "desc" },
    include: {
      account: { select: { name: true } },
      holding: { select: { name: true } }
    }
  });
  return csvRows(
    [
      "id", "dividendDate", "exDividendDate", "accountName", "holdingName",
      "symbol", "amountPerShare", "quantity", "totalAmount", "taxAmount",
      "netAmount", "currency", "fxRate", "isTaxOverridden", "notes",
      "createdAt", "updatedAt"
    ],
    rows.map((d) => [
      d.id,
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
    ])
  );
}

async function buildSnapshotsCsv(): Promise<string> {
  const rows = await prisma.portfolioSnapshot.findMany({ orderBy: { takenAt: "asc" } });
  return csvRows(
    ["takenAt", "netWorth", "totalAssets", "cash", "investments", "liabilities", "allocation"],
    rows.map((s) => [
      s.takenAt.toISOString(),
      toNumber(s.netWorth), toNumber(s.totalAssets),
      toNumber(s.cash), toNumber(s.investments), toNumber(s.liabilities),
      JSON.stringify(s.allocation)
    ])
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  if (!EXPORT_TYPES.has(type as ExportType)) {
    return NextResponse.json({ error: "unknown export type" }, { status: 404 });
  }

  const csv = await (
    type === "accounts" ? buildAccountsCsv() :
    type === "holdings" ? buildHoldingsCsv() :
    type === "dividends" ? buildDividendsCsv() :
    buildSnapshotsCsv()
  );
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="japa-${type}-${stamp}.csv"`
    }
  });
}
