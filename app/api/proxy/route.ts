import { UA } from "@/lib/fliphtml5/destring";

export const runtime = "nodejs";

// Only proxy FlipHTML5 page images — never an open proxy.
const ALLOWED = /(^|\.)fliphtml5\.com$/;
const MAX_BYTES = 4 * 1024 * 1024; // Vercel response body limit is 4.5 MB

export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("url");
  let u: URL;
  try {
    u = new URL(target ?? "");
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (u.protocol !== "https:" || !ALLOWED.test(u.hostname)) {
    return new Response("host not allowed", { status: 403 });
  }

  const upstream = await fetch(u, { headers: { "User-Agent": UA } });
  const type = upstream.headers.get("content-type") ?? "";
  if (!ALLOWED.test(new URL(upstream.url).hostname)) {
    return new Response("redirected off host", { status: 403 });
  }
  if (!upstream.ok || !type.startsWith("image/")) {
    return new Response(`upstream ${upstream.status}`, { status: 502 });
  }
  const buf = await upstream.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return new Response("too large", { status: 413 });

  return new Response(buf, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
