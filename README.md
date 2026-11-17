# tools.rajkumaryd.in

A Next.js (App Router) hub for small web tools, deployed on Vercel.

## Tools

| Tool | Route | How it works |
|---|---|---|
| FlipHTML5 Downloader | `/tools/fliphtml5` | `POST /api/fliphtml5/resolve` fetches the book's `config.js` and decrypts page lists with FlipHTML5's own deString WASM (run natively in Node). The browser then downloads the page images (CORS-enabled; falls back to `/api/proxy`, which only allows `*.fliphtml5.com`) and builds the PDF client-side with `pdf-lib`. |

The PDF is built in the browser on purpose: Vercel functions cap responses at 4.5 MB and limit run time, so a 500-page book could never be returned from a function.

## Adding a tool

1. Create `app/tools/<slug>/page.tsx` (plus `app/api/<slug>/...` if it needs a backend).
2. Add an entry to `lib/tools.ts`. It appears on the home page with search.

## Local dev

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
```

> If your shell has `NODE_ENV=development` set globally, `next build` fails with
> `Cannot read properties of null (reading 'useContext')`. Unset it or run the build with `NODE_ENV=production`.

## Deploy to tools.rajkumaryd.in

1. Push this folder to its own GitHub repo, then **Vercel → Add New → Project → Import** it (framework: Next.js, no settings needed).
2. Project → **Settings → Domains → Add** `tools.rajkumaryd.in`.
3. DNS:
   - If `rajkumaryd.in` uses Vercel nameservers, the subdomain works automatically.
   - Otherwise add a record at your DNS provider: `CNAME  tools  →  cname.vercel-dns.com`.

Or from the CLI: `npx vercel` then `npx vercel domains add tools.rajkumaryd.in`.
