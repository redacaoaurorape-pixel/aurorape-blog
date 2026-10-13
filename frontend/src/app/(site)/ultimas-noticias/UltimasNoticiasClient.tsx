"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ArticleListItem, CategoryOut } from "@/lib/types";
import { formatDate } from "@/lib/format";

interface Props {
  initialArticles: ArticleListItem[];
  categories: CategoryOut[];
}

export default function UltimasNoticiasClient({ initialArticles, categories }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filtered = useMemo(() => {
    return initialArticles.filter((art) => {
      const matchCat =
        selectedCategory === "all" || art.category?.slug === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (art.subtitle && art.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (art.chapeu && art.chapeu.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCat && matchQuery;
    });
  }, [initialArticles, selectedCategory, searchQuery]);

  return (
    <div>
      {/* Barra de Filtro e Busca */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2.5rem",
          padding: "1.25rem",
          background: "var(--color-bg)",
          borderRadius: "8px",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Filtro por categoria */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-muted)", marginRight: "0.25rem" }}>
            Editoria:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            style={{
              padding: "0.4rem 0.85rem",
              borderRadius: "999px",
              border: "1.5px solid",
              borderColor: selectedCategory === "all" ? "var(--color-secondary)" : "var(--color-border)",
              background: selectedCategory === "all" ? "var(--color-secondary)" : "var(--color-surface)",
              color: selectedCategory === "all" ? "#fff" : "var(--color-primary)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: "999px",
                border: "1.5px solid",
                borderColor: selectedCategory === cat.slug ? "var(--color-secondary)" : "var(--color-border)",
                background: selectedCategory === cat.slug ? "var(--color-secondary)" : "var(--color-surface)",
                color: selectedCategory === cat.slug ? "#fff" : "var(--color-primary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Campo de Busca */}
        <div style={{ minWidth: "260px", flex: "1 1 260px", maxWidth: "380px" }}>
          <input
            type="search"
            placeholder="Filtrar por título ou tema..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.55rem 0.9rem",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
              fontSize: "0.9rem",
              outline: "none",
              background: "var(--color-surface)",
              color: "var(--color-primary)",
            }}
          />
        </div>
      </div>

      {/* Listagem de Artigos */}
      {filtered.length > 0 ? (
        <div className="feed">
          {filtered.map((article) => (
            <article key={article.id} className="feed-item">
              <div className="feed-item__body">
                {article.chapeu && <span className="chapeu">{article.chapeu}</span>}
                <h2 className="feed-item__title">
                  <Link href={`/artigo/${article.slug}`}>{article.title}</Link>
                </h2>
                {article.subtitle && <p className="feed-item__excerpt">{article.subtitle}</p>}
                <div className="feed-item__meta">
                  <span>{article.author.name}</span>
                  <span>{formatDate(article.published_at)}</span>
                  {article.category && (
                    <span style={{ color: "var(--color-secondary)", fontWeight: 600 }}>
                      {article.category.name}
                    </span>
                  )}
                  {article.reading_time_min ? <span>{article.reading_time_min} min de leitura</span> : null}
                </div>
              </div>
              {article.featured_image_url && (
                <div className="feed-item__image">
                  <Link href={`/artigo/${article.slug}`} tabIndex={-1} aria-hidden="true">
                    <Image
                      src={article.featured_image_url}
                      alt={article.title}
                      fill
                      sizes="(min-width: 640px) 200px, 100vw"
                      style={{ objectFit: "cover" }}
                    />
                  </Link>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--color-muted)" }}>
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Nenhuma matéria encontrada com os filtros selecionados.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setSearchQuery("");
            }}
            className="btn btn--secondary"
            style={{ marginTop: "1rem" }}
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
