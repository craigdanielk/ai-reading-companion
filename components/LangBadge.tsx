import { findLanguage } from "@/lib/nuance/registry";

const SIZES = {
  sm: "h-5 w-5 text-[11px]",
  md: "h-7 w-7 text-[14px]",
  lg: "h-10 w-10 text-[19px]",
};

const FACE: Record<string, string> = {
  ar: "'Noto Sans Arabic', var(--font-sans)",
  ja: "'Noto Sans JP', var(--font-sans)",
};

export function LangBadge({
  code,
  size = "md",
  labelled,
}: {
  code: string | null | undefined;
  size?: keyof typeof SIZES;
  labelled?: boolean;
}) {
  const lang = findLanguage(code);

  if (!lang) {
    return (
      <span
        className={
          "inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line bg-paper-2 font-sans font-semibold text-muted " +
          SIZES[size]
        }
        title="Language detected on read"
        aria-label="Language detected on read"
      >
        ?
      </span>
    );
  }

  return (
    <span
      className={
        "inline-flex shrink-0 items-center justify-center rounded-full border font-semibold " + SIZES[size]
      }
      style={{
        background: "hsl(" + lang.tint + " 62% 93%)",
        color: "hsl(" + lang.tint + " 48% 27%)",
        borderColor: "hsl(" + lang.tint + " 38% 79%)",
        fontFamily: FACE[lang.code] || "var(--font-display)",
      }}
      title={lang.name + " (" + lang.nativeName + ")"}
      aria-label={labelled ? lang.name : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {lang.glyph}
    </span>
  );
}
