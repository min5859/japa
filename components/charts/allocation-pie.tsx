"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = [
  "#e50914", "#3b82f6", "#22c55e", "#f59e0b",
  "#a855f7", "#06b6d4", "#f97316", "#ec4899",
  "#64748b", "#84cc16"
];

const ASSET_CLASS_LABELS: Record<string, string> = {
  CASH: "현금",
  DOMESTIC_STOCK: "국내주식",
  INTERNATIONAL_STOCK: "해외주식",
  ETF: "ETF",
  BOND: "채권",
  FUND: "펀드",
  CRYPTO: "암호화폐",
  REAL_ESTATE: "부동산",
  LIABILITY: "부채",
  OTHER: "기타"
};

export type AllocationEntry = { assetClass: string; value: number };

function formatKRW(value: number) {
  if (value >= 1_0000_0000) return `${(value / 1_0000_0000).toFixed(1)}억`;
  if (value >= 1_0000) return `${(value / 1_0000).toFixed(0)}만`;
  return `${value.toLocaleString()}`;
}

export function AllocationPieChart({ data }: { data: AllocationEntry[] }) {
  const positive = data.filter((d) => d.value > 0);
  if (positive.length === 0) return null;

  const total = positive.reduce((s, d) => s + d.value, 0);

  const chartData = positive.map((d) => ({
    name: ASSET_CLASS_LABELS[d.assetClass] ?? d.assetClass,
    value: d.value,
    pct: total > 0 ? (d.value / total) * 100 : 0
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [
            `${formatKRW(Number(value))}원 (${((Number(value) / total) * 100).toFixed(1)}%)`,
            name
          ]}
          contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#e0e0e0" }}
          itemStyle={{ color: "#e0e0e0" }}
        />
        <Legend
          formatter={(value) => <span style={{ color: "#aaa", fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
