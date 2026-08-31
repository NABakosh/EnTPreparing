export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="h-8 w-48 animate-pulse rounded bg-border" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-border" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-border" />
        ))}
      </div>
    </div>
  );
}
