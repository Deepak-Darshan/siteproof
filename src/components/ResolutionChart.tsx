"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export type WeekBucket = { label: string; count: number };

type Props = { data: WeekBucket[] };

export function ResolutionChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={24}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          domain={[0, max + 1]}
        />
        <Tooltip
          cursor={{ fill: "#f4f4f5" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const { label, count } = payload[0].payload as WeekBucket;
            return (
              <div className="bg-white border border-zinc-200 rounded-lg px-3 py-1.5 shadow-sm text-xs">
                <p className="text-zinc-500">{label}</p>
                <p className="font-semibold text-zinc-900">{count} resolved</p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.count > 0 ? "#18181b" : "#e4e4e7"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
