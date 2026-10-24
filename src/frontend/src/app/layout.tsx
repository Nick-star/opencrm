import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenCRM — Customer workspace",
  description: "A focused workspace for customer relationships. Built with Go, Next.js and SQLite.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
