import { findKind } from "@/lib/text-kinds";

export function KindBadge({ kind, size = "md" }: { kind: string | null | undefined; size?: "sm" | "md" }) {
  const k = findKind(kind);
  return (
    <span
      className={
        "inline-flex shrink-0 items-center justify-center rounded-pill border font-medium " +
        (size === "sm" ? "px-2 py-[1px] text-[10.5px]" : "px-2.5 py-0.5 text-[11.5px]")
      }
      style={{
        background: "hsl(" + k.tint + " 62% 93%)",
        color: "hsl(" + k.tint + " 45% 27%)",
        borderColor: "hsl(" + k.tint + " 38% 80%)",
      }}
      title={k.hint}
    >
      {k.label}
    </span>
  );
}
