import { destringDecode, UA } from "./destring";

export type ResolvedPage = { index: number; candidates: string[] };
export type ResolvedBook = {
  bookName: string;
  title: string;
  pageCount: number;
  pages: ResolvedPage[];
};

export function normalizeBookName(raw: string): string {
  let s = raw.trim().replace(/^['"]|['"]$/g, "");
  const m = s.match(/fliphtml5\.com\/([^#?\s]+)/);
  if (m) s = m[1];
  s = s.split("#")[0].split("?")[0];
  let parts = s.split("/").filter(Boolean);
  if (parts.length >= 2 && /^index\.html?$/.test(parts[parts.length - 1])) parts = parts.slice(0, -1);
  return parts.slice(0, 2).join("/");
}

function parsePagesJson(text: string): unknown[] | null {
  const raw = text.trim();
  try {
    const d = JSON.parse(raw);
    return Array.isArray(d) ? d : null;
  } catch {
    const s = raw.indexOf("[");
    const e = raw.lastIndexOf("]");
    if (s === -1 || e <= s) return null;
    try {
      const d = JSON.parse(raw.slice(s, e + 1));
      return Array.isArray(d) ? d : null;
    } catch {
      return null;
    }
  }
}

async function decodePages(raw: unknown): Promise<unknown[] | null> {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.startsWith("[")) return parsePagesJson(t);
    return parsePagesJson(await destringDecode(t));
  }
  return null;
}

function pageFilename(page: unknown): string | null {
  if (typeof page === "string") return page;
  if (page && typeof page === "object") {
    const n = (page as { n?: unknown }).n;
    if (Array.isArray(n) && typeof n[0] === "string") return n[0];
    if (typeof n === "string" && n) return n;
  }
  return null;
}

function pageUrl(base: string, file: string, size: string) {
  if (/^https?:\/\//.test(file)) return file;
  const p = file.replace(/^\.\//, "").replace(/^\//, "");
  return new URL(p.startsWith("files/") ? p : `files/${size}/${p}`, base).toString();
}

export async function resolveBook(input: string): Promise<ResolvedBook> {
  const bookName = normalizeBookName(input);
  if (!/^[\w-]+\/[\w-]+$/.test(bookName)) {
    throw new Error("Expected a FlipHTML5 link or ID like ceeok/pkdn");
  }

  const res = await fetch(`https://online.fliphtml5.com/${bookName}/javascript/config.js`, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Book not found (config.js returned ${res.status})`);
  let text = (await res.text()).trim();
  text = text.replace(/^var\s+htmlConfig\s*=\s*/, "").replace(/;\s*$/, "");
  const config = JSON.parse(text);

  let pages = await decodePages(config.fliphtml5_pages);
  if (!pages?.length && typeof config.bookConfig === "string") {
    pages = await decodePages(await destringDecode(config.bookConfig));
  }
  if (!pages?.length) throw new Error("Pages not found or could not be decoded");

  const base = `https://online.fliphtml5.com/${bookName}/`;
  const out: ResolvedPage[] = [];
  pages.forEach((p, i) => {
    const f = pageFilename(p);
    if (!f) return;
    const c = [pageUrl(base, f, "large")];
    if (f.endsWith(".webp")) c.push(pageUrl(base, f.slice(0, -5) + ".jpg", "large"));
    else if (f.endsWith(".jpg")) c.push(pageUrl(base, f.slice(0, -4) + ".webp", "large"));
    c.push(pageUrl(base, f, "medium"), pageUrl(base, f, "thumb"));
    out.push({ index: i + 1, candidates: c });
  });

  const title = (config.meta?.title as string) || bookName.replace("/", "_");
  return { bookName, title, pageCount: out.length, pages: out };
}
