"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

type AdPreset = "sidebarMedium" | "sidebarLarge" | "inline";

const PRESET_CONFIG: Record<
  AdPreset,
  { width: number; height: number; label: string; placeholderClass: string; responsive: boolean }
> = {
  sidebarMedium: { width: 300, height: 250, label: "300 × 250", placeholderClass: "ad-placeholder--mpu", responsive: false },
  sidebarLarge: { width: 300, height: 600, label: "300 × 600", placeholderClass: "ad-placeholder--half", responsive: false },
  inline: { width: 728, height: 90, label: "728 × 90", placeholderClass: "ad-placeholder--banner", responsive: true },
};

/**
 * Unidade de anúncio do Google AdSense.
 *
 * Sem `NEXT_PUBLIC_ADSENSE_CLIENT_ID` e/ou `slot` configurados, renderiza
 * exatamente o placeholder visual tracejado atual (zero mudança de
 * comportamento até o AdSense ser configurado). Com ambos configurados,
 * renderiza o bloco real `<ins class="adsbygoogle">` e dispara o push de
 * inicialização uma única vez por montagem do componente.
 */
export default function AdUnit({ preset, slot }: { preset: AdPreset; slot?: string }) {
  const cfg = PRESET_CONFIG[preset];
  const isConfigured = Boolean(ADSENSE_CLIENT_ID && slot);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!isConfigured || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // AdSense ainda não carregou (ou foi bloqueado por ad blocker) — ignora silenciosamente.
    }
  }, [isConfigured]);

  if (preset === "inline") {
    if (!isConfigured) {
      return (
        <div className="ad-inline" aria-label="Publicidade">
          <div className="ad-placeholder ad-placeholder--banner" role="img" aria-label="Espaço publicitário 728×90">
            <span className="ad-placeholder__label">Publicidade</span>
            <span className="ad-placeholder__size">728 × 90</span>
          </div>
          <div className="ad-placeholder ad-placeholder--strip" role="img" aria-label="Espaço publicitário mobile">
            <span className="ad-placeholder__label">Publicidade</span>
          </div>
        </div>
      );
    }

    return (
      <div className="ad-inline" aria-label="Publicidade">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div
        className={`ad-placeholder ${cfg.placeholderClass}`}
        role="img"
        aria-label={`Espaço publicitário ${cfg.label}`}
      >
        <span className="ad-placeholder__label">Publicidade</span>
        <span className="ad-placeholder__size">{cfg.label}</span>
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "inline-block", width: cfg.width, height: cfg.height }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
    />
  );
}
