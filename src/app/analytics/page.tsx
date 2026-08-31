"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { useI18n } from "@/i18n/context";
import {
  entScoreByYear,
  grantDistribution,
  passScoreByUniversity,
  monthlyApplicants,
} from "@/lib/data/analytics";

const COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2"];

export default function AnalyticsPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader title={t.analytics.title} description={t.analytics.desc} />

      <div className="grid gap-8 lg:grid-cols-2">
        <ChartCard title={t.analytics.chart1}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={entScoreByYear}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="informatics" name={t.analytics.informatics} stroke="#2563eb" strokeWidth={2} />
              <Line type="monotone" dataKey="mathematics" name={t.analytics.mathematics} stroke="#7c3aed" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t.analytics.chart2}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={entScoreByYear}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="average" name={t.analytics.average} fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t.analytics.chart3}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={grantDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" />
              <YAxis dataKey="specialty" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="grants" name={t.analytics.grants} fill="#16a34a" radius={[0, 4, 4, 0]} />
              <Bar dataKey="applicants" name={t.analytics.applicants} fill="#94a3b8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t.analytics.chart4}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={passScoreByUniversity}
                dataKey="score"
                nameKey="university"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(props) => {
                  const entry = passScoreByUniversity[props.index ?? 0];
                  return entry ? `${entry.university}: ${entry.score}` : "";
                }}
              >
                {passScoreByUniversity.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t.analytics.chart5} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyApplicants}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" name={t.analytics.applicants} stroke="#db2777" strokeWidth={2} dot={{ fill: "#db2777" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <p className="mt-8 text-center text-sm text-muted">{t.analytics.disclaimer}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-6 ${className}`}
    >
      <h3 className="mb-4 font-semibold">{title}</h3>
      {children}
    </div>
  );
}
