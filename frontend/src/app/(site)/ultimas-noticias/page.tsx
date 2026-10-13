import type { Metadata } from "next";
import { getCategories, getArticles } from "@/lib/public-api";
import UltimasNoticiasClient from "./UltimasNoticiasClient";

export const metadata: Metadata = {
  title: "Últimas Notícias — Aurora PE",
  description: "Todas as reportagens e artigos publicados no Aurora PE em ordem cronológica.",
};

export default async function UltimasNoticiasPage() {
  const [categories, articles] = await Promise.all([
    getCategories(),
    getArticles(100).catch(() => []),
  ]);

  return (
    <div className="container" style={{ paddingBlock: "2.5rem 4rem" }}>
      <header style={{ marginBottom: "2.5rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "1.5rem" }}>
        <span
          style={{
            display: "inline-block",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-secondary)",
            marginBottom: "0.5rem",
          }}
        >
          Cobertura Completa
        </span>
        <h1
          style={{
            fontFamily: "var(--font-headline)",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 800,
            color: "var(--color-primary)",
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Últimas Notícias
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: "1.05rem", marginTop: "0.75rem" }}>
          Acompanhe todas as reportagens, análises e coberturas de Pernambuco em tempo real.
        </p>
      </header>

      <UltimasNoticiasClient initialArticles={articles} categories={categories} />
    </div>
  );
}
