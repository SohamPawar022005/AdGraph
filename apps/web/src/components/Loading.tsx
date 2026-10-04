export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="py-10 text-center text-sm text-slate-500">{label}</div>;
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
      {message}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="py-8 text-center text-sm text-slate-400">{message}</div>;
}
