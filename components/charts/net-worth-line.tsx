"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

export type SnapshotPoint = {
  label: string;  // e.g. "2025-01"
  netWorth: number;
  totalAssets: number;
  liabilities: number;
};

function formatKRW(value: number) {
  if (Math.abs(value) >= 1_0000_0000) return `${(value / 1_0000_0000).toFixed(1)}억`;
  if (Math.abs(value) >= 1_0000) return `${(value / 1_0000).toFixed(0)}만`;
  return `${value.toLocaleString()}`;
}

export function NetWorthLineChart({ data }: { data: SnapshotPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        스냅샷이 2개 이상 쌓이면 추이 차트가 표시됩니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
        <XAxis dataKey="label" tick={{ fill: "#666", fontSize: 11 }} />
        <YAxis
          tickFormatter={(v) => formatKRW(v)}
          tick={{ fill: "#666", fontSize: 11 }}
          width={60}
        />
        <Tooltip
          formatter={(value, name) => [
            `${formatKRW(Number(value))}원`,
            name === "netWorth" ? "순자산" : name === "totalAssets" ? "총자산" : "부채"
          ]}
          contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#e0e0e0" }}
          itemStyle={{ color: "#e0e0e0" }}
        />
        <ReferenceLine y={0} stroke="#444" />
        <Line
          type="monotone"
          dataKey="totalAssets"
          stroke="#3b82f6"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="4 2"
        />
        <Line
          type="monotone"
          dataKey="netWorth"
          stroke="#e50914"
          strokeWidth={2}
          dot={{ r: 3, fill: "#e50914" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
