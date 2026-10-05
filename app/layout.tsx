import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movies for You — Find your next watch",
  description: "Browse the Movies for You collection, choose a movie, and follow its Watch link. Join our Telegram channel for new additions.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
