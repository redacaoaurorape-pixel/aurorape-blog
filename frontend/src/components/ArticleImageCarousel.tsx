"use client";

import { useEffect, useRef, useState } from "react";
import type { ArticleImageOut } from "@/lib/types";

export default function ArticleImageCarousel({ images }: { images: ArticleImageOut[] }) {
  const total = images.length;
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  function goTo(idx: number) {
    setCurrent(((idx % total) + total) % total);
  }

  useEffect(() => {
    const el = carouselRef.current;
    if (!el || total <= 1) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goTo(current + 1);
      if (e.key === "ArrowLeft") goTo(current - 1);
    }
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, total]);

  if (total === 0) return null;

  const active = images[current];

  return (
    <div
      className="article-image-carousel"
      ref={carouselRef}
      aria-label="Imagens da matéria"
      aria-roledescription="carrossel"
      tabIndex={0}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
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
              key={img.id}
              className="article-image-carousel__slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${total}`}
              aria-hidden={i !== current}
            >
              <img
                className="article-image-carousel__img"
                src={img.image_url}
                alt={img.photographer ? `Foto: ${img.photographer}` : `Imagem ${i + 1} da matéria`}
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              className="article-image-carousel__btn article-image-carousel__btn--prev"
              aria-label="Imagem anterior"
              onClick={() => goTo(current - 1)}
            >
              <svg
                width="20"
                height="20"
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
                width="20"
                height="20"
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

            <div className="article-image-carousel__dots" role="tablist" aria-label="Navegação de imagens">
              {images.map((img, i) => (
                <button
                  type="button"
                  key={img.id}
                  className={`article-image-carousel__dot${i === current ? " is-active" : ""}`}
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`Imagem ${i + 1} de ${total}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {active.photographer && <p className="article-image-carousel__caption">Fotógrafo: {active.photographer}</p>}
    </div>
  );
}
