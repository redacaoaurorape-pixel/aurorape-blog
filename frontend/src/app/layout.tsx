import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aurorape.com.br";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Aurora PE — Jornalismo independente de Pernambuco",
    template: "%s — Aurora PE",
  },
  description: "Portal de notícias de jornalismo independente de Pernambuco com foco no sindicalismo, movimentos sociais e ONGs.",
  keywords: [
    "Aurora PE",
    "Jornalismo Independente",
    "Pernambuco",
    "Recife",
    "Sindicalismo",
    "Movimentos Sociais",
    "Notícias",
  ],
  authors: [{ name: "Aurora PE", url: siteUrl }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Aurora PE",
    title: "Aurora PE — Jornalismo independente de Pernambuco",
    description: "Notícias de qualidade com foco no sindicalismo, movimentos populares e lutas sociais em Pernambuco.",
    images: [
      {
        url: "/images/logo.avif",
        width: 800,
        height: 600,
        alt: "Aurora PE",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurora PE — Jornalismo independente de Pernambuco",
    description: "Notícias de qualidade com foco no sindicalismo e movimentos sociais em Pernambuco.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
