import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Explore OMD - Local Destination Management Platform",
  description: "Discover, book, and experience local destinations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

