"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebar() {
  const pathname = usePathname();

  const isArtigos =
    pathname === "/admin" || (pathname.startsWith("/admin/artigos/") && pathname !== "/admin/artigos/novo");

  return (
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-sidebar__brand">
        <img src="/images/logo.avif" alt="Aurora PE" />
        <span className="admin-sidebar__brand-text">
          Aurora PE
          <small>Painel administrativo</small>
        </span>
      </Link>

      <nav className="admin-nav" aria-label="Menu administrativo">
        <span className="admin-nav__label">Conteúdo</span>

        <Link href="/admin" aria-current={isArtigos ? "page" : undefined}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Artigos
        </Link>

        <Link href="/admin/artigos/novo" aria-current={pathname === "/admin/artigos/novo" ? "page" : undefined}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Nova matéria
        </Link>

        <hr className="admin-nav__divider" />
        <span className="admin-nav__label">Cadastros</span>

        <Link href="/admin/users" aria-current={pathname.startsWith("/admin/users") ? "page" : undefined}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Colaboradores
        </Link>

        <Link href="/admin/categorias" aria-current={pathname.startsWith("/admin/categorias") ? "page" : undefined}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          Categorias
        </Link>

        <div className="admin-nav__footer">
          <hr className="admin-nav__divider" />
          <a href="/" target="_blank" rel="noopener">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Ver site
          </a>
          <form action="/admin/logout" method="POST" style={{ margin: 0, padding: 0 }}>
            <button
              type="submit"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.625rem 1.25rem",
                fontSize: "0.875rem",
                color: "rgba(255, 255, 255, 0.6)",
                background: "none",
                border: "none",
                cursor: "pointer",
                width: "100%",
                font: "inherit",
                textAlign: "left",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sair
            </button>
          </form>
        </div>
      </nav>
    </aside>
  );
}
