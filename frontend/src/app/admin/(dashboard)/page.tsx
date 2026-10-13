import Link from "next/link";
import { requireAdminToken } from "@/lib/auth";
import { getDashboard, listArticles } from "@/lib/admin-api";
import { formatDate } from "@/lib/format";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteArticleAction } from "./artigos/actions";

export const metadata = { title: "Matérias — Aurora PE Admin" };

export default async function AdminDashboardPage() {
  const token = await requireAdminToken();
  const [dashboardData, articles] = await Promise.all([
    getDashboard(token),
    listArticles(token),
  ]);
  const { total_articles, total_published, total_authors } = dashboardData;
  const total_views = dashboardData.total_views ?? articles.reduce((acc, a) => acc + (a.views_count ?? 0), 0);
  const avg_reading_time = articles.length > 0
    ? Math.round(articles.reduce((acc, a) => acc + (a.reading_time_min ?? 1), 0) / articles.length)
    : 1;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <p className="admin-topbar__breadcrumb">Aurora PE Admin</p>
          <h1>Matérias</h1>
        </div>
        <Link href="/admin/artigos/novo" className="btn-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova matéria
        </Link>
      </div>

      <div className="admin-body">
        <div className="stat-cards">
          <div className="stat-card stat-card--primary">
            <div className="stat-card__value">{total_articles}</div>
            <div className="stat-card__label">Total de matérias</div>
          </div>
          <div className="stat-card stat-card--green">
            <div className="stat-card__value">{total_published}</div>
            <div className="stat-card__label">Publicadas</div>
          </div>
          <div className="stat-card stat-card--red">
            <div className="stat-card__value">{total_articles - total_published}</div>
            <div className="stat-card__label">Rascunhos</div>
          </div>
          <div className="stat-card stat-card--accent">
            <div className="stat-card__value">{total_authors}</div>
            <div className="stat-card__label">Colaboradores</div>
          </div>
          <div className="stat-card stat-card--primary">
            <div className="stat-card__value">{total_views}</div>
            <div className="stat-card__label">Total de acessos</div>
          </div>
          <div className="stat-card stat-card--accent">
            <div className="stat-card__value">{avg_reading_time} min</div>
            <div className="stat-card__label">Tempo médio de leitura</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <Link href="/admin/users" className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "0.875rem", textDecoration: "none", color: "inherit" }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(79,142,247,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="2" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-text)" }}>Colaboradores</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>Gerenciar colaboradores</div>
            </div>
          </Link>
          <Link href="/admin/categorias" className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "0.875rem", textDecoration: "none", color: "inherit" }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(245,166,35,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" aria-hidden="true">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-text)" }}>Categorias</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>Editorias do portal</div>
            </div>
          </Link>
          <a href="/" target="_blank" className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "0.875rem", textDecoration: "none", color: "inherit" }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(26,26,26,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-text)" }}>Ver site</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>Abrir em nova aba</div>
            </div>
          </a>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Autor</th>
                <th>Categoria</th>
                <th>Visualizações</th>
                <th>Status</th>
                <th>Data</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {articles.length > 0 ? (
                articles.map((article) => (
                  <tr key={article.id} id={`article-row-${article.id}`}>
                    <td style={{ maxWidth: 360 }}>
                      <Link
                        href={`/admin/artigos/${article.id}/editar`}
                        style={{ fontWeight: 600, color: "var(--color-text)", textDecoration: "none" }}
                        className="table-title-link"
                      >
                        {article.title}
                      </Link>
                      <div className="table-slug">/{article.slug}</div>
                    </td>
                    <td style={{ color: "var(--color-muted)" }}>{article.author.name}</td>
                    <td>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {article.category.name}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--color-text)" }}>
                      {article.views_count ?? 0}
                    </td>
                    <td>
                      {article.is_published ? (
                        <span className="badge badge-green">Publicado</span>
                      ) : (
                        <span className="badge badge-gray">Rascunho</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                      {formatDate(article.published_at) || "—"}
                    </td>
                    <td>
                      <div className="table-actions">
                        <a href={`/artigo/${article.slug}`} target="_blank" rel="noopener" className="btn-icon" title="Ver no site">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                        <Link href={`/admin/artigos/${article.id}/editar`} className="btn-icon" title="Editar">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>
                        <DeleteButton
                          confirmMessage={`Excluir '${article.title}'?`}
                          onDelete={deleteArticleAction.bind(null, article.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--color-muted)", padding: "3.5rem" }}>
                    Nenhuma matéria cadastrada.
                    <Link href="/admin/artigos/novo" style={{ color: "var(--color-secondary)", fontWeight: 600, marginLeft: "0.5rem" }}>
                      Criar a primeira →
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
