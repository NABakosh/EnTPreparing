"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };
const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 13 };

/** Динамика баллов: одна серия, заголовок задаёт карточка — легенда не нужна. */
export function ScoreLine({ data, max, valueLabel }: { data: { label: string; score: number }[]; max: number; valueLabel: string }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
          <YAxis domain={[0, max]} tick={AXIS} tickLine={false} axisLine={false} width={44} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, valueLabel]} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
          <Line type="monotone" dataKey="score" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Процент верных по категориям: горизонтальные столбцы (подписи длинные — так читаются на телефоне). */
export function PctBars({ data, valueLabel }: { data: { name: string; pct: number }[]; valueLabel: string }) {
  const h = Math.max(160, data.length * 44 + 30);
  return (
    <div className="w-full" style={{ height: h }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barCategoryGap={10}>
          <CartesianGrid stroke="var(--border)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} unit="%" />
          <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={130} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, valueLabel]} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="pct" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
