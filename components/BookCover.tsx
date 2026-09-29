// Covers are typeset, not photographed. Real cover art is copyrighted and
// hotlinking it is both fragile and legally murky, and a generated image would
// make every book look like the same product. A clothbound-edition cover is
// always present, always legible, and unmistakably ours.

const CLOTHS = [
  { bg: "#2E3A34", fg: "#EFE6D8" },
  { bg: "#3A2C28", fg: "#F2E7D8" },
  { bg: "#27333F", fg: "#E7EBEE" },
  { bg: "#43272E", fg: "#F2E4DD" },
  { bg: "#3B3A2A", fg: "#EDE7D6" },
  { bg: "#2A2833", fg: "#E9E5EF" },
  { bg: "#1F2E33", fg: "#E3EBEC" },
  { bg: "#E3D6C0", fg: "#3A2E24" },
];

function cloth(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  return CLOTHS[h % CLOTHS.length];
}

const SIZES = {
  shelf: { pad: "p-4", title: "text-[16px] leading-[1.25]", author: "text-[10.5px]", rule: "w-6", show: 4 },
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
      <div className={"relative aspect-[2/3] overflow-hidden rounded-[3px] shadow-sm " + className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  const c = cloth(title || "Untitled");

  return (
    <div
      className={"relative flex aspect-[2/3] flex-col overflow-hidden rounded-[3px] shadow-sm " + s.pad + " " + className}
      style={{
        background:
          "linear-gradient(90deg, rgba(0,0,0,0.28) 0 3px, rgba(255,255,255,0.06) 3px 5px, transparent 5px), " +
          c.bg,
        color: c.fg,
      }}
      aria-hidden
    >
      <p className={"font-display font-semibold " + s.title} style={{ color: c.fg }}>
        <span className={"line-clamp-" + s.show}>{title || "Untitled"}</span>
      </p>
      <div className="mt-auto">
        {author && (
          <>
            <div className={"mb-1.5 h-px " + s.rule} style={{ background: c.fg, opacity: 0.35 }} />
            <p className={s.author} style={{ color: c.fg, opacity: 0.78 }}>
              {author}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
