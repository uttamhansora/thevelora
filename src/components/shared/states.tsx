import { LoaderCircle } from "lucide-react";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card px-6 py-14 text-center">
      <h2 className="font-serif text-3xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-muted">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl bg-rose/40" />)}
    </div>
  );
}

export function LoadingInline({ label }: { label: string }) {
  return <p className="inline-flex items-center gap-2 text-muted"><LoaderCircle className="animate-spin" size={16} aria-hidden />{label}</p>;
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <span className="rounded-full border border-gold/70 px-2.5 py-1 text-xs uppercase tracking-wide text-primary">{status.replaceAll("_", " ")}</span>;
}
