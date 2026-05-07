import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Colaciones Sin Frontera",
  description: "Menú del día - Comida peruana, chilena y venezolana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
