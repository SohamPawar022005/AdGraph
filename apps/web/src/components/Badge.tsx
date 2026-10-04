const STYLES: Record<string, string> = {
  VERIFIED: "bg-emerald-100 text-emerald-800",
  verified: "bg-emerald-100 text-emerald-800",
  CANDIDATE: "bg-amber-100 text-amber-800",
  candidate: "bg-amber-100 text-amber-800",
  SYNTHETIC: "bg-sky-100 text-sky-800",
  UNVERIFIED: "bg-slate-200 text-slate-700",
  REJECTED: "bg-rose-100 text-rose-800",
  rejected: "bg-rose-100 text-rose-800",
  deprecated: "bg-slate-200 text-slate-600",
  superseded: "bg-slate-200 text-slate-600",
  valid: "bg-emerald-100 text-emerald-800",
  invalid: "bg-rose-100 text-rose-800",
  pending: "bg-amber-100 text-amber-800",
};

export default function Badge({ children }: { children: string }) {
  const style = STYLES[children] ?? "bg-slate-200 text-slate-700";
  return <span className={`badge ${style}`}>{children}</span>;
}
