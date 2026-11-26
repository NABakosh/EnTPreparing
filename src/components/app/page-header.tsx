export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-[2rem]">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-card p-5 shadow-soft sm:p-7 ${className}`}>
      {title && <h2 className="mb-5 text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="rounded-3xl border-2 border-dashed border-[#c6e3ef] bg-card/70 p-10 text-center text-muted-foreground">{text}</p>;
}
