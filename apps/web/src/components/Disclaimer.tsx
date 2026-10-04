export default function Disclaimer({ text, tone = "default" }: { text: string; tone?: "default" | "warning" }) {
  const toneClass =
    tone === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-slate-300 bg-slate-50 text-slate-600";
  return (
    <div className={`rounded-md border px-3 py-2 text-xs leading-relaxed ${toneClass}`}>
      {text}
    </div>
  );
}
