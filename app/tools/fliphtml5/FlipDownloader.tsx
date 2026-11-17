"use client";

import { useRef, useState } from "react";
import type { ResolvedBook } from "@/lib/fliphtml5/resolve";

type Phase = "idle" | "resolving" | "ready" | "downloading" | "building" | "done" | "error";
const CONCURRENCY = 6;

async function toJpeg(blob: Blob): Promise<{ bytes: Uint8Array; w: number; h: number }> {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const out = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.92),
  );
  return { bytes: new Uint8Array(await out.arrayBuffer()), w: canvas.width, h: canvas.height };
}

export default function FlipDownloader() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [book, setBook] = useState<ResolvedBook | null>(null);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);
  const [pdfUrl, setPdfUrl] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const viaProxy = useRef(false);

  async function resolve(e: React.FormEvent) {
    e.preventDefault();
    setPhase("resolving");
    setError("");
    setBook(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl("");
    try {
      const r = await fetch("/api/fliphtml5/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to read book");
      setBook(data);
      setFrom(1);
      setTo(data.pageCount);
      setPhase("ready");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }

  async function fetchImage(url: string, signal: AbortSignal): Promise<Blob> {
    if (!viaProxy.current) {
      try {
        const r = await fetch(url, { signal, mode: "cors" });
        if (r.ok) return await r.blob();
        throw new Error(`http ${r.status}`);
      } catch (e) {
        if (signal.aborted) throw e;
        // A TypeError here usually means CORS is blocked: switch to the proxy for the rest.
        if (e instanceof TypeError) viaProxy.current = true;
        else throw e;
      }
    }
    const r = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, { signal });
    if (!r.ok) throw new Error(`proxy ${r.status}`);
    return r.blob();
  }

  async function build() {
    if (!book) return;
    const a = Math.max(1, Math.min(from, to));
    const b = Math.min(book.pageCount, Math.max(from, to));
    const pages = book.pages.slice(a - 1, b);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase("downloading");
    setDone(0);
    setFailed([]);
    setError("");

    const results: ({ bytes: Uint8Array; w: number; h: number } | null)[] = new Array(pages.length).fill(null);
    const bad: number[] = [];
    let next = 0;

    async function worker() {
      while (next < pages.length && !ctrl.signal.aborted) {
        const i = next++;
        const p = pages[i];
        for (const url of p.candidates) {
          try {
            const blob = await fetchImage(url, ctrl.signal);
            results[i] = await toJpeg(blob);
            break;
          } catch {
            if (ctrl.signal.aborted) return;
          }
        }
        if (!results[i]) bad.push(p.index);
        setDone((d) => d + 1);
      }
    }

    try {
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      if (ctrl.signal.aborted) {
        setPhase("ready");
        return;
      }
      setFailed(bad.sort((x, y) => x - y));
      if (results.every((r) => !r)) throw new Error("No pages could be downloaded.");

      setPhase("building");
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      pdf.setTitle(book.title);
      for (const r of results) {
        if (!r) continue;
        const img = await pdf.embedJpg(r.bytes);
        const w = r.w * 0.75;
        const h = r.h * 0.75;
        pdf.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
      }
      const bytes = await pdf.save();
      setPdfUrl(URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" })));
      setPhase("done");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }

  const total = book ? Math.abs(to - from) + 1 : 0;
  const busy = phase === "resolving" || phase === "downloading" || phase === "building";
  const fileName = (book?.title || "book").replace(/[<>:"/\\|?*]/g, "_") + ".pdf";

  return (
    <div className="stack">
      <form className="card row" onSubmit={resolve}>
        <input
          className="input grow"
          placeholder="https://online.fliphtml5.com/xxxxx/yyyy/  or  xxxxx/yyyy"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          required
        />
        <button className="btn" disabled={busy || !input.trim()}>
          {phase === "resolving" ? "Reading…" : "Find book"}
        </button>
      </form>

      {error && <div className="card alert">{error}</div>}

      {book && (
        <div className="card stack">
          <div>
            <h2 className="book-title">{book.title}</h2>
            <p className="muted">
              {book.bookName} · {book.pageCount} pages
            </p>
          </div>

          <div className="row wrap-row">
            <label className="field">
              From page
              <input type="number" className="input" min={1} max={book.pageCount} value={from}
                onChange={(e) => setFrom(+e.target.value || 1)} disabled={busy} />
            </label>
            <label className="field">
              To page
              <input type="number" className="input" min={1} max={book.pageCount} value={to}
                onChange={(e) => setTo(+e.target.value || 1)} disabled={busy} />
            </label>
            <div className="row grow end">
              {phase === "downloading" ? (
                <button className="btn btn-ghost" onClick={() => abortRef.current?.abort()}>Cancel</button>
              ) : (
                <button className="btn" onClick={build} disabled={busy}>
                  {phase === "building" ? "Building PDF…" : `Create PDF (${total} pages)`}
                </button>
              )}
            </div>
          </div>

          {(phase === "downloading" || phase === "building") && (
            <div>
              <div className="progress"><div style={{ width: `${(done / total) * 100}%` }} /></div>
              <p className="muted small">
                {phase === "building" ? "Stitching PDF…" : `Downloaded ${done} / ${total} pages`}
              </p>
            </div>
          )}

          {failed.length > 0 && (
            <p className="muted small">Skipped {failed.length} page(s) that could not be fetched: {failed.join(", ")}</p>
          )}

          {phase === "done" && pdfUrl && (
            <a className="btn btn-success" href={pdfUrl} download={fileName}>
              ⬇ Download {fileName}
            </a>
          )}
        </div>
      )}

      <p className="muted small">
        Only works for public books. Large books (500+ pages) can take a few minutes and use a lot of
        browser memory — use the page range to split them. Respect copyright.
      </p>
    </div>
  );
}
