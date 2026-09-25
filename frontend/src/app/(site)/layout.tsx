import Script from "next/script";
import { getCategories } from "@/lib/public-api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();

  return (
    <>
      {ADSENSE_CLIENT_ID && (
        <Script
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />
      )}
      <Header categories={categories} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer categories={categories} />
    </>
  );
}
