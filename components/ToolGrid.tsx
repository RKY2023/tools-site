"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Tool } from "@/lib/tools";

export default function ToolGrid({ tools }: { tools: Tool[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tools;
    return tools.filter((t) =>
      [t.name, t.description, t.category, ...t.tags].join(" ").toLowerCase().includes(s),
    );
  }, [q, tools]);

  return (
    <>
      <input
        className="input search"
        placeholder={`Search ${tools.length} tool${tools.length === 1 ? "" : "s"}…`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search tools"
      />
      <div className="grid">
        {shown.map((t) => (
          <Link key={t.slug} href={`/tools/${t.slug}`} className="card tool-card">
            <div className="tool-card-top">
              <span className="chip">{t.category}</span>
              {t.status && <span className="chip chip-accent">{t.status}</span>}
            </div>
            <h2>{t.name}</h2>
            <p className="muted">{t.description}</p>
          </Link>
        ))}
        {shown.length === 0 && <p className="muted">No tools match “{q}”.</p>}
      </div>
    </>
  );
}
