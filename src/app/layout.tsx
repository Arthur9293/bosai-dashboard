import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOSAI Dashboard",
  description: "Operational monitoring dashboard for BOSAI Worker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
