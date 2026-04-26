"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import type { HistoryPoint } from "@/lib/market";

type Props = {
  data: HistoryPoint[];
  name: string;
  isYield: boolean;
  currency: string;
  currentPrice: number;
  changePercent: number;
};

function formatValue(value: number, isYield: boolean, currency: string) {
  if (isYield) return `${value.toFixed(2)}%`;
  if (currency === "KRW")
    return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function MarketChart({ data, name, isYield, currency, currentPrice, changePercent }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        데이터 없음 — 시세 새로고침을 눌러주세요
      </div>
    );
  }

  const first = data[0].value;
  const up = changePercent > 0;
  const down = changePercent < 0;
  const lineColor = up ? "#ef4444" : down ? "#3b82f6" : "#6b7280";
  const changeColor = up ? "text-red-500" : down ? "text-blue-500" : "text-muted-foreground";
  const changePrefix = up ? "▲" : down ? "▼" : "";

  const tickCount = Math.min(6, data.length);
  const step = Math.floor(data.length / tickCount);
  const ticks = data.filter((_, i) => i % step === 0).map((d) => d.date);

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="text-2xl font-bold">
          {formatValue(currentPrice, isYield, currency)}
        </span>
        <span className={`text-sm font-medium ${changeColor}`}>
          {changePrefix}{Math.abs(changePercent).toFixed(2)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => formatValue(v, isYield, currency)}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            formatter={(v) => [formatValue(Number(v), isYield, currency), name]}
            labelFormatter={(label) => new Date(label).toLocaleDateString("ko-KR")}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12
            }}
          />
          <ReferenceLine y={first} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
