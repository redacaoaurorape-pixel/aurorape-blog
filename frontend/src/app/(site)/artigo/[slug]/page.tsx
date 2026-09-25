import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getArticle, getRelated } from "@/lib/public-api";
import { formatDateLong } from "@/lib/format";
import ArticleCard from "@/components/ArticleCard";
import ArticleImageCarousel from "@/components/ArticleImageCarousel";
import ArticleFontControl from "@/components/article/ArticleFontControl";
import ShareBar from "@/components/article/ShareBar";
import NewsletterForm from "@/components/NewsletterForm";

async function loadArticle(slug: string) {
  try {
    return await getArticle(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) return {};

  return {
    title: `${article.title} — Aurora PE`,
    description: article.subtitle ?? article.title,
    openGraph: {
      title: article.title,
      description: article.subtitle ?? "",
      images: article.featured_image_url ? [article.featured_image_url] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) notFound();

  const related = await getRelated(slug);

  return (
    <div className="container">
      <div className="with-ad-sidebar">
        <div>
          <article className="piaui-article">
            {article.category && (
              <Link href={`/categoria/${article.category.slug}`} className="piaui-article__category">
                {article.category.name}
              </Link>
            )}

            <h1 className="piaui-article__title">{article.title}</h1>
            {article.subtitle && <p className="piaui-article__subtitle">{article.subtitle}</p>}

            <hr className="piaui-article__rule" />

            <div className="piaui-article__meta">
              <span>
                Por <Link href={`/autor/${article.author.slug}`}>{article.author.name}</Link>
              </span>
              <time dateTime={article.published_at ?? ""}>{formatDateLong(article.published_at)}</time>
              {article.reading_time_min ? (
                <span className="reading-time-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {article.reading_time_min} min de leitura
                </span>
              ) : null}
              <ArticleFontControl />
            </div>

            <ShareBar title={article.title} />

            <ArticleImageCarousel images={article.images} />

            <div
              className="piaui-body"
              id="article-body"
              dangerouslySetInnerHTML={{ __html: article.body }}
            />

            <hr className="piaui-article__rule" />

            {article.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem" }}>
                {article.tags.map((tag) => (
                  <span
                    key={tag.id}
                    style={{
                      background: "var(--color-bg)",
                      border: "1.5px solid var(--color-border)",
                      borderRadius: "999px",
                      padding: "0.25rem 0.75rem",
                      fontSize: "0.8rem",
                      color: "var(--color-muted)",
                    }}
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}

            <div className="piaui-author">
              {article.author.photo_url && (
                <Image src={article.author.photo_url} alt={article.author.name} className="piaui-author__photo" width={72} height={72} />
              )}
              <div>
                <p className="piaui-author__label">Autor</p>
                <Link href={`/autor/${article.author.slug}`} className="piaui-author__name">
                  {article.author.name}
                </Link>
              </div>
            </div>
          </article>

          {related.length > 0 && (
            <div className="related-articles">
              <div className="section-heading">
                <div className="section-heading__bar" aria-hidden="true" />
                <span className="section-heading__text">Leia também</span>
              </div>
              <div className="secondary-grid">
                {related.map((art) => (
                  <ArticleCard key={art.id} article={art} variant="editorial" />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="newsletter-block">
              <h2>Não perca nada do Aurora PE</h2>
              <p>Assine nossa newsletter e receba as melhores reportagens.</p>
              <NewsletterForm id="newsletter-article-feedback" />
            </div>
          </div>
        </div>

        <aside className="ad-sidebar" aria-label="Publicidade">
          <div className="ad-placeholder ad-placeholder--mpu" role="img" aria-label="Espaço publicitário 300×250">
            <span className="ad-placeholder__label">Publicidade</span>
            <span className="ad-placeholder__size">300 × 250</span>
          </div>
          <div className="ad-placeholder ad-placeholder--half" role="img" aria-label="Espaço publicitário 300×600">
            <span className="ad-placeholder__label">Publicidade</span>
            <span className="ad-placeholder__size">300 × 600</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
