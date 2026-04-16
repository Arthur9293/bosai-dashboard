import "./globals.css"
import type { ReactNode } from "react"
import { AppChrome } from "@/components/layout/AppChrome"

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-black text-white antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  )
}
