import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/features/app-shell/ui/providers";
import "./globals.css";

const title = "Grabbin: Visual Link in Bio & Personal Website on Your Domain";
const description =
  "Grabbin is a free link in bio that works like a personal website. Arrange links, photos, videos, and places in one bento-style page and use your own domain.";

export const metadata: Metadata = {
  metadataBase: new URL("https://grabbin.me"),
  title,
  description,
  openGraph: { title, description, siteName: "Grabbin", type: "website" },
  icons: { icon: "/favicon.svg" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Grabbin",
  url: "https://grabbin.me",
  logo: "https://grabbin.me/favicon.svg",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c"),
          }}
        />
        <Providers>{children}</Providers>
        {/* Add any future third-party scripts here. */}
      </body>
    </html>
  );
}
