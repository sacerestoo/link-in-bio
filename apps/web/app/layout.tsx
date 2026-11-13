import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "grabbin",
  description: "grabbin on vinext and Cloudflare Workers",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
