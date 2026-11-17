import type { Metadata } from "next";
import Link from "next/link";
import FlipDownloader from "./FlipDownloader";

export const metadata: Metadata = {
  title: "FlipHTML5 Downloader",
  description: "Convert a public FlipHTML5 flipbook into a PDF in your browser.",
};

export default function Page() {
  return (
    <>
      <Link href="/" className="back">← All tools</Link>
      <section className="hero">
        <h1>FlipHTML5 Downloader</h1>
        <p className="muted">
          Paste a book link like <code>https://online.fliphtml5.com/ceeok/pkdn/</code> or just{" "}
          <code>ceeok/pkdn</code>. Pages are fetched and stitched into a PDF right in your browser.
        </p>
      </section>
      <FlipDownloader />
    </>
  );
}
