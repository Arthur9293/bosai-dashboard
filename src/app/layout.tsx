import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BOSAI",
  description: "BOSAI SaaS V1 Dashboard",
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
