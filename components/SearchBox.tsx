"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? "/library?q=" + encodeURIComponent(term) : "/library");
      }}
      className="px-3 pb-2"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search texts and contents…"
        aria-label="Search"
        className="w-full rounded-pill border border-line bg-paper px-3 py-1.5 text-[12.5px] text-ink placeholder:text-muted"
      />
    </form>
  );
}
