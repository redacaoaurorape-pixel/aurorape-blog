"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ArticleListItem } from "@/lib/types";
import { formatDate, normalizeImageUrl } from "@/lib/format";
import { getCategoryArticles } from "@/lib/public-api";

function FeedItem({ article }: { article: ArticleListItem }) {
  const imageUrl = normalizeImageUrl(article.featured_image_url);
  return (
    <article className="feed-item">
      <div className="feed-item__body">
        {article.chapeu && <span className="chapeu">{article.chapeu}</span>}
        <h3 className="feed-item__title">
          <Link href={`/artigo/${article.slug}`}>{article.title}</Link>
        </h3>
        {article.subtitle && <p className="feed-item__excerpt">{article.subtitle}</p>}
        <div className="feed-item__meta">
          <span>{article.author.name}</span>
          <span>{formatDate(article.published_at)}</span>
          {article.reading_time_min ? <span>{article.reading_time_min} min</span> : null}
        </div>
      </div>
      {imageUrl && (
        <div className="feed-item__image">
          <Link href={`/artigo/${article.slug}`} tabIndex={-1} aria-hidden="true">
            <Image src={imageUrl} alt={article.title} fill sizes="(min-width: 640px) 200px, 100vw" style={{ objectFit: "cover" }} />
          </Link>
        </div>
      )}
    </article>
  );
}

export default function LoadMoreFeed({
  categorySlug,
  initialItems,
  initialPage,
  pageSize = 12,
}: {
  categorySlug?: string;
  initialItems: ArticleListItem[];
  initialPage: number;
  pageSize?: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialItems.length >= pageSize);

  async function loadMore() {
    if (!categorySlug) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await getCategoryArticles(categorySlug, next);
      setItems((prev) => [...prev, ...res.items]);
      setPage(next);
      setHasMore(res.items.length >= pageSize);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="feed" id="feed">
        {items.map((article) => (
          <FeedItem key={article.id} article={article} />
        ))}
      </div>

      {hasMore && categorySlug && (
        <div className="text-center mt-4">
          <button
            className="btn-subscribe"
            style={{ background: "var(--color-primary)" }}
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Carregar mais"}
          </button>
        </div>
      )}
    </>
  );
}
