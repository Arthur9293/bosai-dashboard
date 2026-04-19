import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-black text-white antialiased">
        <div
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            right: 12,
            zIndex: 9999,
            padding: "12px 16px",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "16px",
            background: "rgba(220,38,38,0.92)",
            color: "#fff",
            fontSize: "16px",
            fontWeight: 700,
          }}
        >
          ROOT LAYOUT OK
        </div>

        {children}
      </body>
    </html>
  );
}
