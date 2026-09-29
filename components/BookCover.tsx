// Covers are typeset, not photographed. Real cover art is copyrighted and
// hotlinking it is both fragile and legally murky, and a generated image would
// make every book look like the same product. A clothbound-edition cover is
// always present, always legible, and unmistakably ours.
//
// Cloth is drawn from the book's title, so a shelf settles into a stable, varied
// run of colours as it grows — the FNV-1a hash matters here, a weak one clusters
// neighbouring titles onto the same cloth and the shelf goes monotone.

const CLOTHS = [
  { bg: "#E9DCC6", fg: "#3A2E24" },
  { bg: "#DED0B6", fg: "#3B3025" },
  { bg: "#CBD4C4", fg: "#2C3A2E" },
  { bg: "#C6D0DA", fg: "#26333F" },
  { bg: "#E5CFC7", fg: "#43272E" },
  { bg: "#DCBE79", fg: "#3A2E10" },
  { bg: "#CE8A6A", fg: "#3A1E12" },
  { bg: "#2E3A34", fg: "#EFE6D8" },
  { bg: "#5A2E33", fg: "#F2E0DC" },
  { bg: "#27333F", fg: "#E7EBEE" },
  { bg: "#3B2F4A", fg: "#EDE7F2" },
  { bg: "#26242B", fg: "#EDE9E4" },
];

function cloth(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return CLOTHS[(h >>> 0) % CLOTHS.length];
}

const SIZES = {
  shelf: { pad: "p-4", title: "text-[15px] leading-[1.3]", author: "text-[10.5px]", rule: "w-6", show: 3 },
  header: { pad: "p-2.5", title: "text-[11px] leading-[1.25]", author: "text-[8px]", rule: "w-4", show: 3 },
  row: { pad: "p-2", title: "text-[10px] leading-[1.25]", author: "text-[7px]", rule: "w-3", show: 2 },
};

export function BookCover({
  title,
  author,
  coverUrl,
  size = "shelf",
  className = "",
}: {
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];

  if (coverUrl) {
    return (
      <div className={"relative aspect-[2/3] overflow-hidden rounded-[4px] shadow-sm " + className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  const c = cloth(title || "Untitled");

  return (
    <div
      className={"relative flex aspect-[2/3] flex-col overflow-hidden rounded-[4px] shadow-sm " + s.pad + " " + className}
      style={{
        background:
          "linear-gradient(90deg, rgba(0,0,0,0.16) 0 3px, rgba(255,255,255,0.10) 3px 5px, transparent 5px), " +
          c.bg,
        color: c.fg,
      }}
      aria-hidden
    >
      <p className={"font-display font-semibold " + s.title} style={{ color: c.fg }}>
        <span className={"line-clamp-" + s.show}>{title || "Untitled"}</span>
      </p>
      {author && (
        <div className="mt-auto">
          <div className={"mb-1.5 h-px " + s.rule} style={{ background: c.fg, opacity: 0.4 }} />
          <p className={s.author} style={{ color: c.fg, opacity: 0.8 }}>
            {author}
          </p>
        </div>
      )}
    </div>
  );
}
