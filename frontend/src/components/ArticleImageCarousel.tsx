"use client";

import { useEffect, useRef, useState } from "react";
import type { ArticleImageOut } from "@/lib/types";
import { normalizeImageUrl } from "@/lib/format";

export default function ArticleImageCarousel({ images }: { images: ArticleImageOut[] }) {
  const total = images.length;
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function goTo(idx: number) {
    const next = ((idx % total) + total) % total;
    setCurrent(next);
    thumbRefs.current[next]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }

  useEffect(() => {
    const el = carouselRef.current;
    if (!el || total <= 1) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(current + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(current - 1);
      }
    }
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, total]);

  if (total === 0) return null;

  const active = images[current] || images[0];

  return (
    <div
      className="article-image-carousel"
      ref={carouselRef}
      aria-label="Galeria de fotos da matéria"
      aria-roledescription="carrossel"
      tabIndex={total > 1 ? 0 : undefined}
      onTouchStart={(e) => {
        if (total <= 1) return;
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (total <= 1) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
          goTo(diff > 0 ? current + 1 : current - 1);
        }
      }}
    >
      <div className="article-image-carousel__viewport">
        <div
          className="article-image-carousel__track"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {images.map((img, i) => (
            <div
              key={img.id ?? i}
              className="article-image-carousel__slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${total}`}
              aria-hidden={i !== current}
            >
              <img
                className="article-image-carousel__img"
                src={normalizeImageUrl(img.image_url)}
                alt={img.photographer ? `Foto: ${img.photographer}` : `Imagem ${i + 1} da matéria`}
                loading={i === 0 ? "eager" : "lazy"}
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>

        {total > 1 && (
          <>
            {/* Badge contador de fotos bem visível com alto contraste */}
            <div className="article-image-carousel__badge" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span>{current + 1} de {total} fotos</span>
            </div>

            {/* Botões de navegação anterior / próximo */}
            <button
              type="button"
              className="article-image-carousel__btn article-image-carousel__btn--prev"
              aria-label="Imagem anterior"
              onClick={() => goTo(current - 1)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className="article-image-carousel__btn article-image-carousel__btn--next"
              aria-label="Próxima imagem"
              onClick={() => goTo(current + 1)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Indicadores de paginação (dots) com contraste garantido */}
            <div className="article-image-carousel__dots" role="tablist" aria-label="Navegação rápida por foto">
              {images.map((img, i) => (
                <button
                  type="button"
                  key={img.id ?? i}
                  className={`article-image-carousel__dot${i === current ? " is-active" : ""}`}
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`Foto ${i + 1} de ${total}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Faixa de miniaturas (thumbnails strip) logo abaixo do carrossel quando total > 1 */}
      {total > 1 && (
        <div
          className="article-image-carousel__thumbs"
          role="tablist"
          aria-label="Miniaturas das fotos da matéria"
        >
          {images.map((img, i) => (
            <button
              type="button"
              key={img.id ?? i}
              ref={(el) => {
                thumbRefs.current[i] = el;
              }}
              className={`article-image-carousel__thumb${i === current ? " is-active" : ""}`}
              role="tab"
              aria-selected={i === current}
              aria-label={`Ver foto ${i + 1} de ${total}`}
              onClick={() => goTo(i)}
            >
              <img
                src={normalizeImageUrl(img.image_url)}
                alt=""
                className="article-image-carousel__thumb-img"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      )}

      {/* Legenda do fotógrafo da foto ativa */}
      {active?.photographer?.trim() ? (
        <p className="article-image-carousel__caption" aria-live="polite">
          Foto: {active.photographer.trim()}
        </p>
      ) : null}
    </div>
  );
}

