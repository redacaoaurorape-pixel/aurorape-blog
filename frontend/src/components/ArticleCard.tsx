import Image from "next/image";
import Link from "next/link";
import type { ArticleListItem } from "@/lib/types";
import { formatDate, normalizeImageUrl } from "@/lib/format";

export type ArticleCardVariant = "featured" | "editorial" | "compact" | "default";

const SIZES_GRID = "(min-width: 1024px) 25vw, (min-width: 480px) 50vw, 100vw";

export default function ArticleCard({
  article,
  variant = "default",
}: {
  article: ArticleListItem;
  variant?: ArticleCardVariant;
}) {
  const href = `/artigo/${article.slug}`;
  const imageUrl = normalizeImageUrl(article.featured_image_url);

  if (variant === "featured") {
    return (
      <article className="featured-card">
        {imageUrl && (
          <div className="featured-card__image">
            <Link href={href} tabIndex={-1} aria-hidden="true">
              <Image src={imageUrl} alt={article.title} fill sizes={SIZES_GRID} style={{ objectFit: "cover" }} />
            </Link>
          </div>
        )}
        {article.chapeu && <span className="chapeu featured-card__chapeu">{article.chapeu}</span>}
        <h3 className="featured-card__title">
          <Link href={href}>{article.title}</Link>
        </h3>
        <p className="featured-card__meta">
          {article.author.name} &middot; {formatDate(article.published_at)}
        </p>
      </article>
    );
  }

  if (variant === "editorial") {
    return (
      <article className="card-editorial">
        {imageUrl && (
          <div className="card-editorial__image">
            <Link href={href} tabIndex={-1} aria-hidden="true">
              <Image src={imageUrl} alt={article.title} fill sizes="(min-width: 1024px) 50vw, 100vw" style={{ objectFit: "cover" }} />
            </Link>
          </div>
        )}
        {article.chapeu && <span className="chapeu">{article.chapeu}</span>}
        <h3 className="card-editorial__title">
          <Link href={href}>{article.title}</Link>
        </h3>
        {article.subtitle && <p className="card-editorial__subtitle">{article.subtitle}</p>}
        <p className="card-editorial__meta">
          {article.author.name} &middot; {formatDate(article.published_at)}
        </p>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="card-compact">
        {article.chapeu && <span className="chapeu">{article.chapeu}</span>}
        <h3 className="card-compact__title">
          <Link href={href}>{article.title}</Link>
        </h3>
        <p className="card-compact__meta">
          {article.author.name} &middot; {formatDate(article.published_at)}
        </p>
      </article>
    );
  }

  return (
    <article className="article-card">
      {imageUrl && (
        <div className="article-card__image">
          <Link href={href} tabIndex={-1} aria-hidden="true">
            <Image src={imageUrl} alt={article.title} fill sizes={SIZES_GRID} style={{ objectFit: "cover" }} />
          </Link>
        </div>
      )}
      {article.chapeu && <span className="chapeu">{article.chapeu}</span>}
      <h3 className="article-card__title">
        <Link href={href}>{article.title}</Link>
      </h3>
      <p className="article-card__meta">
        <span>{article.author.name}</span> &middot; <span>{formatDate(article.published_at)}</span>
        {article.reading_time_min ? (
          <>
            {" "}
            &middot; <span>{article.reading_time_min} min de leitura</span>
          </>
        ) : null}
      </p>
    </article>
  );
}
