"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ArticleListItem } from "@/lib/types";
import { formatDateLong, normalizeImageUrl } from "@/lib/format";

const INTERVAL_MS = 4000;

export default function HeroCarousel({
  hero,
  secondary,
}: {
  hero?: ArticleListItem | null;
  secondary: ArticleListItem[];
}) {
  const slides = hero ? [hero, ...secondary.slice(0, 4)] : [];
  const total = slides.length;
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  function goTo(idx: number) {
    setCurrent(((idx % total) + total) % total);
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (total <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % total);
    }, INTERVAL_MS);
  }

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el || total <= 1) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        goTo(current + 1);
        startTimer();
      }
      if (e.key === "ArrowLeft") {
        goTo(current - 1);
        startTimer();
      }
    }
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, total]);

  if (!hero || total === 0) return null;

  return (
    <div
      className="hero-carousel"
      id="hero-carousel"
      ref={carouselRef}
      aria-label="Destaques"
      aria-roledescription="carrossel"
      tabIndex={0}
      onMouseEnter={() => timerRef.current && clearInterval(timerRef.current)}
      onMouseLeave={startTimer}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
          goTo(diff > 0 ? current + 1 : current - 1);
          startTimer();
        }
      }}
    >
      <div
        className="hero-carousel__track"
        id="hero-carousel-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((art, i) => (
          <div
            key={art.id}
            className="hero-carousel__slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={i !== current}
          >
            <Link href={`/artigo/${art.slug}`} className="hero-overlay" tabIndex={i === current ? 0 : -1}>
              {art.featured_image_url && (
                <Image
                  className="hero-overlay__img"
                  src={normalizeImageUrl(art.featured_image_url)}
                  alt={art.title}
                  fill
                  sizes="100vw"
                  priority={i === 0}
                  style={{ objectFit: "cover" }}
                />
              )}
              <div className="hero-overlay__content">
                {art.chapeu && <span className="hero-overlay__chapeu">{art.chapeu}</span>}
                <h2 className="hero-overlay__title">{art.title}</h2>
                <div className="hero-overlay__meta">
                  <span>{art.author.name}</span>
                  <span>{formatDateLong(art.published_at)}</span>
                  {art.reading_time_min ? <span>{art.reading_time_min} min de leitura</span> : null}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            className="hero-carousel__btn hero-carousel__btn--prev"
            aria-label="Slide anterior"
            onClick={() => {
              goTo(current - 1);
              startTimer();
            }}
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
            className="hero-carousel__btn hero-carousel__btn--next"
            aria-label="Próximo slide"
            onClick={() => {
              goTo(current + 1);
              startTimer();
            }}
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

          <div className="hero-carousel__dots" role="tablist" aria-label="Navegação de slides">
            {slides.map((art, i) => (
              <button
                key={art.id}
                className={`hero-carousel__dot${i === current ? " is-active" : ""}`}
                role="tab"
                aria-selected={i === current}
                aria-label={`Slide ${i + 1}: ${art.title}`}
                onClick={() => {
                  goTo(i);
                  startTimer();
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
