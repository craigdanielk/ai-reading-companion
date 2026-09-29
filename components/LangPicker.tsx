import { LANGUAGES } from "@/lib/nuance/registry";
import { LangBadge } from "./LangBadge";

export function LangPicker({
  name,
  defaultValue,
  includeAuto,
  legend,
}: {
  name: string;
  defaultValue: string;
  includeAuto?: boolean;
  legend: string;
}) {
  const options = [
    ...(includeAuto ? [{ code: "auto", name: "Detect", nativeName: "Detect automatically" }] : []),
    ...LANGUAGES.map((l) => ({ code: l.code, name: l.name, nativeName: l.nativeName })),
  ];

  return (
    <fieldset className="mt-1">
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o.code} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={o.code}
              defaultChecked={o.code === defaultValue}
              className="peer sr-only"
            />
            <span
              className="flex items-center gap-1.5 rounded-pill border border-line bg-paper py-1 pl-1 pr-3 text-[13px] text-ink-soft transition-colors peer-checked:border-ember peer-checked:bg-paper-2 peer-checked:font-medium peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ember"
              title={o.nativeName}
            >
              <LangBadge code={o.code} size="sm" />
              {o.name}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
