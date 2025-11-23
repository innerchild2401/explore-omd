import type { Metadata } from "next";
import "./globals.css";
import { generateSeoMetadata } from "@/lib/seo/utils";

export const metadata: Metadata = generateSeoMetadata({
  title: "Dest Explore - Soluții complete pentru gestionarea destinațiilor turistice",
  description: "Soluții complete pentru gestionarea și promovarea destinațiilor turistice. Platformă unificată pentru OMD-uri și parteneri locali.",
  path: "/",
  type: "website",
  siteName: "Dest Explore",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}

