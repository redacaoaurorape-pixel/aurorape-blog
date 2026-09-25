import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getHome } from "@/lib/public-api";
import HeroCarousel from "@/components/HeroCarousel";
import ArticleCard from "@/components/ArticleCard";
import NewsletterForm from "@/components/NewsletterForm";
import AdUnit from "@/components/AdUnit";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Aurora PE — Jornalismo independente de Pernambuco",
  description: "O melhor do jornalismo pernambucano.",
};

export default async function HomePage() {
  const { hero, secondary, feed } = await getHome();

  const categorySections: { slug: string; name: string; big: (typeof feed)[number]; rest: typeof feed }[] = [];
  const seen = new Set<string>();
  for (const article of feed) {
    if (article.category && !seen.has(article.category.slug) && categorySections.length < 3) {
      seen.add(article.category.slug);
      const rest = feed
        .filter((a) => a.category?.slug === article.category.slug && a.id !== article.id)
        .slice(0, 3);
      categorySections.push({ slug: article.category.slug, name: article.category.name, big: article, rest });
    }
  }

  return (
    <>
      <HeroCarousel hero={hero} secondary={secondary} />

      <div className="container">
        {secondary && secondary.length > 2 && (
          <section aria-label="Em destaque" className="featured-grid">
            {secondary.slice(2).map((article) => (
              <ArticleCard key={article.id} article={article} variant="featured" />
            ))}
          </section>
        )}

        <AdUnit preset="inline" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_INLINE_TOP} />

        {feed.length > 0 && (
          <section aria-label="Últimas notícias" style={{ marginBottom: "3.5rem" }}>
            <div className="section-heading section-heading--red">
              <div className="section-heading__bar" aria-hidden="true" />
              <span className="section-heading__text">Últimas notícias</span>
            </div>

            <div className="ultimas-grid">
              <div className="ultimas-grid__main">
                <ArticleCard article={feed[0]} variant="editorial" />
              </div>
              <div className="ultimas-grid__list">
                {feed.slice(1, 5).map((article) => (
                  <Link key={article.id} href={`/artigo/${article.slug}`} className="ultimas-item">
                    <div className="ultimas-item__body">
                      {article.chapeu && <span className="ultimas-item__chapeu">{article.chapeu}</span>}
                      <h3 className="ultimas-item__title">{article.title}</h3>
                      <div className="ultimas-item__meta">
                        {article.author.name} &middot; {formatDate(article.published_at)}
                      </div>
                    </div>
                    {article.featured_image_url && (
                      <Image
                        src={article.featured_image_url}
                        alt={article.title}
                        className="ultimas-item__img"
                        width={72}
                        height={56}
                      />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {categorySections.map((section) => (
          <section key={section.slug} className="cat-section" aria-label={section.name} style={{ marginBottom: "3rem" }}>
            <div className="section-heading">
              <div className="section-heading__bar" aria-hidden="true" />
              <span className="section-heading__text">{section.name}</span>
              <Link href={`/categoria/${section.slug}`} className="section-heading__link" aria-label={`Ver tudo de ${section.name}`}>
                Ver tudo →
              </Link>
            </div>
            <div className="cat-section__grid">
              <div className="cat-section__big-card">
                <ArticleCard article={section.big} variant="editorial" />
              </div>
              <div className="cat-section__list">
                {section.rest.map((article) => (
                  <ArticleCard key={article.id} article={article} variant="compact" />
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="brand-section" aria-label="Sobre o Aurora PE">
          <span className="brand-section__label">Aurora PE</span>
          <h2 className="brand-section__title">Jornalismo que serve a Pernambuco</h2>
          <p className="brand-section__desc">
            Fundado por jornalistas pernambucanos, o Aurora PE é comprometido com a verdade, a independência
            editorial e o interesse público.
          </p>
          <Link href="/sobre" className="brand-section__cta">
            Conheça nossa história
          </Link>
        </section>

        <AdUnit preset="inline" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_INLINE_BOTTOM} />

        <section aria-label="Newsletter" className="newsletter-block" style={{ marginBottom: "4rem" }}>
          <h2>Não perca nada do Aurora PE</h2>
          <p>Assine nossa newsletter e receba as melhores reportagens direto no e-mail.</p>
          <NewsletterForm id="newsletter-feedback-home" />
        </section>

        <section aria-label="Mais notícias" style={{ marginBottom: "4rem" }}>
          <div className="section-heading">
            <div className="section-heading__bar" aria-hidden="true" />
            <span className="section-heading__text">Mais notícias</span>
          </div>

          <div className="feed" id="feed">
            {feed.map((article) => (
              <article key={article.id} className="feed-item">
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
                {article.featured_image_url && (
                  <div className="feed-item__image">
                    <Link href={`/artigo/${article.slug}`} tabIndex={-1} aria-hidden="true">
                      <Image src={article.featured_image_url} alt={article.title} fill sizes="(min-width: 640px) 200px, 100vw" style={{ objectFit: "cover" }} />
                    </Link>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
