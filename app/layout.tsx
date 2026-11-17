import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tools.rajkumaryd.in"),
  title: { default: "Tools · rajkumaryd.in", template: "%s · Tools" },
  description: "A small collection of handy web tools by Rajkumar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="wrap topbar-inner">
            <Link href="/" className="brand">
              <span className="brand-mark">⌘</span> tools<span className="muted">.rajkumaryd.in</span>
            </Link>
            <a href="https://rajkumaryd.in" className="navlink">
              rajkumaryd.in ↗
            </a>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="wrap footer">
          Built by <a href="https://rajkumaryd.in">Rajkumar</a>. Use tools only on content you have the right to use.
        </footer>
      </body>
    </html>
  );
}
