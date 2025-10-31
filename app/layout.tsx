import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dest Explore - Soluții complete pentru gestionarea destinațiilor turistice",
  description: "Soluții complete pentru gestionarea și promovarea destinațiilor turistice. Platformă unificată pentru OMD-uri și parteneri locali.",
};

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

