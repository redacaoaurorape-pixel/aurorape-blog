"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { toSlug } from "@/lib/format";
import { uploadArticleImageAction } from "@/app/admin/(dashboard)/artigos/actions";
import type { ArticleOut, AuthorMini, CategoryOut } from "@/lib/types";

type ImageDraft = {
  key: string;
  url: string;
  photographer: string;
  mode: "url" | "upload";
  uploading: boolean;
  uploadError: string | null;
  previewError: boolean;
  localPreviewUrl?: string;
};

let draftKeySeq = 0;
function makeDraftKey() {
  draftKeySeq += 1;
  return `img-${draftKeySeq}`;
}

const TOOLBAR_BUTTONS: { cmd: string; val?: string; title: string; label: string }[] = [
  { cmd: "bold", title: "Negrito (Ctrl+B)", label: "B" },
  { cmd: "italic", title: "Itálico (Ctrl+I)", label: "I" },
  { cmd: "underline", title: "Sublinhado", label: "U" },
  { cmd: "formatBlock", val: "h2", title: "Subtítulo H2", label: "H2" },
  { cmd: "formatBlock", val: "h3", title: "Intertítulo H3", label: "H3" },
  { cmd: "formatBlock", val: "blockquote", title: "Citação / Pull quote", label: "”" },
  { cmd: "insertUnorderedList", title: "Lista com marcadores", label: "•" },
  { cmd: "insertOrderedList", title: "Lista numerada", label: "1." },
  { cmd: "removeFormat", title: "Remover formatação", label: "✕" },
];

export default function ArticleForm({
  mode = "create",
  article,
  categories,
  authors,
  action,
}: {
  mode?: "create" | "edit";
  article?: ArticleOut;
  categories: CategoryOut[];
  authors: AuthorMini[];
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const bodyHiddenRef = useRef<HTMLTextAreaElement>(null);
  const statusCheckboxRef = useRef<HTMLInputElement>(null);
  const actionIntentRef = useRef<HTMLInputElement>(null);

  const [slug, setSlug] = useState(article?.slug ?? "");
  const slugEdited = useRef(Boolean(article?.slug));

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    if (article?.category?.id) return String(article.category.id);
    if (article?.chapeu) {
      const match = categories.find((c) => c.name.toLowerCase() === article.chapeu?.toLowerCase());
      if (match) return String(match.id);
    }
    return "";
  });

  const [chapeuValue, setChapeuValue] = useState<string>(() => {
    if (article?.chapeu) return article.chapeu;
    if (article?.category?.name) return article.category.name;
    return "";
  });

  const [images, setImages] = useState<ImageDraft[]>(() =>
    (article?.images ?? []).map((img) => ({
      key: makeDraftKey(),
      url: img.image_url,
      photographer: img.photographer ?? "",
      mode: "url" as const,
      uploading: false,
      uploadError: null,
      previewError: false,
    }))
  );
  const [, startUploadTransition] = useTransition();

  const [isPublished, setIsPublished] = useState(article?.is_published ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<"publish" | "save_draft" | "save_edit" | null>(null);
  const [statusWarning, setStatusWarning] = useState<string | null>(null);

  function addImage() {
    setImages((prev) => [
      ...prev,
      {
        key: makeDraftKey(),
        url: "",
        photographer: "",
        mode: "url",
        uploading: false,
        uploadError: null,
        previewError: false,
      },
    ]);
  }

  function removeImage(key: string) {
    setImages((prev) => prev.filter((img) => img.key !== key));
  }

  function moveImage(key: string, direction: -1 | 1) {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.key === key);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function updateImage(key: string, patch: Partial<ImageDraft>) {
    setImages((prev) => prev.map((img) => (img.key === key ? { ...img, ...patch } : img)));
  }

  function handleImageFile(key: string, file: File | undefined) {
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    updateImage(key, {
      localPreviewUrl: localUrl,
      previewError: false,
      uploading: true,
      uploadError: null,
    });
    const formData = new FormData();
    formData.append("file", file);
    startUploadTransition(async () => {
      const result = await uploadArticleImageAction(formData);
      if ("error" in result) {
        updateImage(key, { uploading: false, uploadError: result.error });
      } else {
        updateImage(key, {
          uploading: false,
          uploadError: null,
          url: result.url,
          previewError: false,
        });
      }
    });
  }

  const imagesJsonValue = JSON.stringify(
    images
      .map((img) => ({ url: img.url.trim(), photographer: img.photographer.trim() || null }))
      .filter((img) => img.url)
  );

  function syncBody() {
    if (bodyHiddenRef.current && editorRef.current) {
      bodyHiddenRef.current.value = editorRef.current.innerHTML;
    }
  }

  function handleToolbarClick(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    syncBody();
  }

  function handleLink() {
    const selection = window.getSelection();
    const anchor = selection?.anchorNode?.parentElement?.closest("a") as HTMLAnchorElement | null;
    const url = window.prompt("URL do link:", anchor?.href || "https://");
    if (url === null) return;
    if (url === "") {
      document.execCommand("unlink", false);
    } else {
      document.execCommand("createLink", false, url);
      const newAnchor = window.getSelection()?.anchorNode?.parentElement?.closest("a") as HTMLAnchorElement | null;
      if (newAnchor) newAnchor.target = "_blank";
    }
    editorRef.current?.focus();
    syncBody();
  }

  function handleInsertImage() {
    const url = window.prompt("URL da imagem para inserir no texto:", "https://");
    if (!url || !url.trim()) return;
    const alt = window.prompt("Legenda / Descrição da imagem (opcional):", "") ?? "";
    const html = `<img src="${url.trim()}" alt="${alt.trim()}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 1rem 0;" />`;
    document.execCommand("insertHTML", false, html);
    editorRef.current?.focus();
    syncBody();
  }

  function handleInsertVideo() {
    const raw = window.prompt("Cole o link ou código de incorporação do vídeo (YouTube, Vimeo, etc.):", "https://");
    if (!raw || !raw.trim()) return;
    let embedUrl = raw.trim();

    // YouTube watch link to embed link
    const ytMatch = embedUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    const html = `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1.5rem 0; border-radius: 6px;"><iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe></div>`;
    document.execCommand("insertHTML", false, html);
    editorRef.current?.focus();
    syncBody();
  }

  function validateCommon(): boolean {
    syncBody();
    const titleInput = formRef.current?.querySelector<HTMLInputElement>("#title");
    if (!titleInput?.value.trim()) {
      setStatusWarning("Por favor, preencha o título da matéria.");
      titleInput?.focus();
      return false;
    }

    const categorySelect = formRef.current?.querySelector<HTMLSelectElement>("#category_id");
    if (!categorySelect?.value) {
      setStatusWarning("Por favor, selecione o Chapéu / Editoria da matéria.");
      categorySelect?.focus();
      return false;
    }

    const authorSelect = formRef.current?.querySelector<HTMLSelectElement>("#author_id");
    if (!authorSelect?.value) {
      setStatusWarning("Por favor, selecione um autor.");
      authorSelect?.focus();
      return false;
    }

    // Validação de foto obrigatória para imagens adicionadas
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.uploading) {
        setStatusWarning(`A Imagem ${i + 1} ainda está sendo enviada. Aguarde o envio concluir antes de salvar.`);
        return false;
      }
      if ((img.url.trim() || img.localPreviewUrl) && !img.photographer.trim()) {
        setStatusWarning(`Por favor, informe os créditos de "Foto: (obrigatório)" na Imagem ${i + 1}.`);
        return false;
      }
    }

    const plainText = editorRef.current?.innerText?.trim() ?? "";
    const htmlText = editorRef.current?.innerHTML ?? "";
    if (!plainText && !htmlText.includes("<img") && !htmlText.includes("<iframe")) {
      setStatusWarning("Por favor, escreva o corpo da matéria.");
      editorRef.current?.focus();
      return false;
    }

    return true;
  }

  function handleSaveEditClick() {
    if (isSubmitting) return;
    if (!validateCommon()) return;

    setStatusWarning(null);
    if (actionIntentRef.current) {
      actionIntentRef.current.value = "save_edit";
    }
    setSubmitIntent("save_edit");
    setIsSubmitting(true);
    formRef.current?.requestSubmit();
  }

  function handlePublishClick() {
    if (isSubmitting) return;
    if (!validateCommon()) return;

    if (!isPublished) {
      setStatusWarning(
        "Atenção: A matéria só será publicada no site se a caixa de Status 'Publicado' estiver marcada. Marque a opção 'Publicado' para publicar ou salve como rascunho."
      );
      statusCheckboxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      statusCheckboxRef.current?.focus();
      return;
    }

    setStatusWarning(null);
    if (actionIntentRef.current) {
      actionIntentRef.current.value = "publish";
    }
    setSubmitIntent("publish");
    setIsSubmitting(true);
    formRef.current?.requestSubmit();
  }

  function handleSaveDraftClick() {
    if (isSubmitting) return;
    if (!validateCommon()) return;

    setStatusWarning(null);
    setIsPublished(false);
    if (actionIntentRef.current) {
      actionIntentRef.current.value = "save_draft";
    }
    setSubmitIntent("save_draft");
    setIsSubmitting(true);
    formRef.current?.requestSubmit();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    syncBody();
  }

  return (
    <form ref={formRef} id="article-form" action={action} onSubmit={handleSubmit}>
      {/* Input oculto que informa a intenção da ação */}
      <input ref={actionIntentRef} type="hidden" name="action_intent" defaultValue="publish" />

      {/* Topbar integrada ao formulário */}
      <div className="admin-topbar">
        <div>
          <p className="admin-topbar__breadcrumb">
            <a href="/admin" style={{ color: "var(--color-muted)" }}>
              Matérias
            </a>{" "}
            / {mode === "create" ? "Nova" : "Editar"}
          </p>
          <h1>{mode === "create" ? "Nova matéria" : "Editar matéria"}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {article?.slug && (
            <a href={`/artigo/${article.slug}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Ver no site ↗
            </a>
          )}
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleSaveEditClick}
              disabled={isSubmitting}
              className="btn-primary"
              style={{ minWidth: 140 }}
            >
              {isSubmitting && submitIntent === "save_edit" ? "Salvando…" : "Salvar alterações"}
            </button>
          )}
        </div>
      </div>

      <div className="admin-body">
        {statusWarning && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #f59e0b",
              borderRadius: 6,
              padding: "0.875rem 1rem",
              marginBottom: "1.25rem",
              color: "#92400e",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{statusWarning}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="card form-section">
              <div className="form-group">
                <label className="form-label" htmlFor="category_id">
                  Chapéu / Editoria <span style={{ color: "var(--color-secondary)" }}>*</span>{" "}
                  <span className="form-hint">Selecione a editoria que aparecerá como chapéu acima do título</span>
                </label>
                <select
                  className="form-control"
                  id="category_id"
                  name="category_id"
                  required
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedCategoryId(id);
                    const found = categories.find((c) => String(c.id) === id);
                    setChapeuValue(found ? found.name : "");
                  }}
                >
                  <option value="">Selecione a editoria (obrigatório)…</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <input type="hidden" id="chapeu" name="chapeu" value={chapeuValue} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="title">
                  Título <span style={{ color: "var(--color-secondary)" }}>*</span>
                </label>
                <input
                  className="form-control"
                  type="text"
                  id="title"
                  name="title"
                  placeholder="Título da matéria"
                  required
                  autoComplete="off"
                  defaultValue={article?.title ?? ""}
                  onChange={(e) => {
                    if (!slugEdited.current) setSlug(toSlug(e.target.value));
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="slug">
                  Slug <span className="form-hint">URL amigável — gerado automaticamente pelo título</span>
                </label>
                <input
                  className="form-control"
                  type="text"
                  id="slug"
                  name="slug"
                  placeholder="titulo-da-materia"
                  value={slug}
                  onChange={(e) => {
                    slugEdited.current = true;
                    setSlug(e.target.value);
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="subtitle">
                  Subtítulo / Lead
                </label>
                <textarea
                  className="form-control"
                  id="subtitle"
                  name="subtitle"
                  rows={2}
                  placeholder="Resumo ou linha fina da matéria"
                  defaultValue={article?.subtitle ?? ""}
                />
              </div>
            </div>

            {/* Imagens da Matéria - Centralizado entre o subtítulo e o corpo da matéria */}
            <div className="card form-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
                <div>
                  <h3
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "var(--color-text)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      margin: 0,
                    }}
                  >
                    Imagens da matéria
                  </h3>
                  <p className="form-hint" style={{ margin: "0.25rem 0 0 0" }}>
                    A primeira imagem vira a capa da matéria. Adicione fotos adicionais para o carrossel.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem", whiteSpace: "nowrap" }}
                  onClick={addImage}
                >
                  + Adicionar imagem
                </button>
              </div>

              {images.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {images.map((img, index) => {
                    const displaySrc = img.localPreviewUrl || img.url;
                    return (
                      <div
                        key={img.key}
                        style={{
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          padding: "1rem",
                          background: index === 0 ? "rgba(245, 166, 35, 0.03)" : "#fff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.875rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {displaySrc && !img.previewError ? (
                              <img
                                src={displaySrc}
                                alt=""
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 6,
                                  objectFit: "cover",
                                  border: "1px solid var(--color-border)",
                                  flexShrink: 0,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 6,
                                  background: "var(--color-bg)",
                                  border: "1px dashed var(--color-border)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.9rem",
                                  color: "var(--color-muted)",
                                  flexShrink: 0,
                                }}
                              >
                                📷
                              </div>
                            )}
                            <div>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: index === 0 ? "var(--color-secondary)" : "var(--color-muted)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                {index === 0 ? "Imagem 1 (Capa principal)" : `Imagem ${index + 1}`}
                              </span>
                              {displaySrc && (
                                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-muted)" }}>
                                  {img.localPreviewUrl ? "Arquivo local selecionado" : "Link da imagem configurado"}
                                </p>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Mover para cima"
                              disabled={index === 0}
                              onClick={() => moveImage(img.key, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Mover para baixo"
                              disabled={index === images.length - 1}
                              onClick={() => moveImage(img.key, 1)}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="btn-icon btn-icon--danger"
                              title="Remover imagem"
                              onClick={() => removeImage(img.key)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                          <button
                            type="button"
                            className={img.mode === "url" ? "btn-secondary" : "btn-icon"}
                            style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem", width: "auto", height: "auto" }}
                            onClick={() => updateImage(img.key, { mode: "url" })}
                          >
                            Colar URL
                          </button>
                          <button
                            type="button"
                            className={img.mode === "upload" ? "btn-secondary" : "btn-icon"}
                            style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem", width: "auto", height: "auto" }}
                            onClick={() => updateImage(img.key, { mode: "upload" })}
                          >
                            Enviar arquivo
                          </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                          {img.mode === "url" ? (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                                Link da imagem:
                              </label>
                              <input
                                className="form-control"
                                type="url"
                                placeholder="https://…"
                                value={img.url}
                                onChange={(e) => updateImage(img.key, { url: e.target.value, localPreviewUrl: undefined, previewError: false })}
                              />
                            </div>
                          ) : (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                                Selecionar do computador:
                              </label>
                              <input
                                className="form-control"
                                type="file"
                                accept="image/*"
                                disabled={img.uploading}
                                onChange={(e) => handleImageFile(img.key, e.target.files?.[0])}
                              />
                              {img.uploading && <p className="form-hint" style={{ marginTop: "0.25rem" }}>Enviando imagem…</p>}
                              {img.uploadError && (
                                <p style={{ color: "var(--color-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                                  {img.uploadError}
                                </p>
                              )}
                              {!img.uploading && !img.uploadError && img.url && (
                                <p className="form-hint" style={{ marginTop: "0.25rem", color: "var(--color-primary)" }}>
                                  ✓ Upload concluído com sucesso.
                                </p>
                              )}
                            </div>
                          )}

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                              Foto: (obrigatório) <span style={{ color: "var(--color-secondary)" }}>*</span>
                            </label>
                            <input
                              className="form-control"
                              type="text"
                              placeholder="Nome do fotógrafo ou fonte da imagem"
                              required={Boolean(displaySrc?.trim())}
                              value={img.photographer}
                              onChange={(e) => updateImage(img.key, { photographer: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* Pré-visualização da imagem selecionada */}
                        {displaySrc && displaySrc.trim() && (
                          <div
                            style={{
                              marginTop: "0.75rem",
                              borderRadius: 6,
                              overflow: "hidden",
                              border: "1px solid var(--color-border)",
                              background: "var(--color-bg)",
                              textAlign: "center",
                            }}
                          >
                            {!img.previewError ? (
                              <img
                                key={displaySrc.trim()}
                                src={displaySrc.trim()}
                                alt={`Pré-visualização da imagem ${index + 1}`}
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                style={{
                                  width: "100%",
                                  maxHeight: "300px",
                                  objectFit: "contain",
                                  display: "block",
                                  background: "#1a1a1a",
                                }}
                                onError={() => {
                                  if (!img.localPreviewUrl) {
                                    updateImage(img.key, { previewError: true });
                                  }
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  padding: "1rem",
                                  color: "var(--color-secondary)",
                                  fontSize: "0.8rem",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <span>Imagem inacessível ou link com bloqueio de acesso (hotlink). Verifique se o endereço é direto para o arquivo de imagem (.jpg, .png, .webp).</span>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", width: "auto" }}
                                  onClick={() => updateImage(img.key, { previewError: false })}
                                >
                                  Tentar carregar novamente
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: "1.25rem",
                    border: "1.5px dashed var(--color-border)",
                    borderRadius: 8,
                    textAlign: "center",
                    color: "var(--color-muted)",
                    fontSize: "0.85rem",
                  }}
                >
                  Nenhuma imagem adicionada ainda. Clique em "+ Adicionar imagem" para incluir a capa e carrossel.
                </div>
              )}

              <input type="hidden" name="images_json" value={imagesJsonValue} readOnly />
            </div>

            <div className="card form-section" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--color-border)" }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Corpo da matéria <span style={{ color: "var(--color-secondary)" }}>*</span>
                </label>
              </div>

              <div className="editor-toolbar" role="toolbar" aria-label="Formatação de texto">
                {TOOLBAR_BUTTONS.map((btn) => (
                  <button
                    key={btn.cmd + (btn.val ?? "")}
                    type="button"
                    className="editor-toolbar__btn"
                    title={btn.title}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleToolbarClick(btn.cmd, btn.val);
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="editor-toolbar__btn"
                  title="Inserir link"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleLink();
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="editor-toolbar__btn"
                  title="Inserir imagem no corpo"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleInsertImage();
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="editor-toolbar__btn"
                  title="Inserir vídeo (YouTube / Vimeo / link)"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleInsertVideo();
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </button>
              </div>

              <div
                ref={editorRef}
                className="rich-editor"
                contentEditable
                role="textbox"
                aria-multiline="true"
                aria-label="Corpo da matéria"
                data-placeholder="Comece a escrever aqui…"
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: article?.body ?? "" }}
                onInput={syncBody}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
                  }
                }}
              />

              {/* Textarea acessível e oculto sem atributo 'required' nativo para evitar bloqueios de validação do browser */}
              <textarea
                ref={bodyHiddenRef}
                name="body"
                tabIndex={-1}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  width: "1px",
                  height: "1px",
                  padding: 0,
                  margin: "-1px",
                  overflow: "hidden",
                  clip: "rect(0, 0, 0, 0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
                defaultValue={article?.body ?? ""}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              className="card form-section"
              style={{
                border: statusWarning && !isPublished ? "2px solid #f59e0b" : undefined,
                transition: "border 0.2s ease",
              }}
            >
              <h3
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "var(--color-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Status
              </h3>
              <div
                className="form-group"
                style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}
              >
                <input
                  ref={statusCheckboxRef}
                  type="checkbox"
                  id="is_published"
                  name="is_published"
                  value="true"
                  checked={isPublished}
                  onChange={(e) => {
                    setIsPublished(e.target.checked);
                    if (e.target.checked) setStatusWarning(null);
                  }}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--color-secondary)" }}
                />
                <label htmlFor="is_published" style={{ fontWeight: 600, cursor: "pointer", userSelect: "none" }}>
                  Publicado
                </label>
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: isPublished ? "var(--color-primary)" : "var(--color-muted)",
                  lineHeight: 1.4,
                  margin: 0,
                }}
              >
                {isPublished
                  ? "✓ Marcado como publicado. Clique no botão 'Publicar' no topo para colocar no ar."
                  : "Modo rascunho. Não será exibido no site público."}
              </p>
            </div>

            <div className="card form-section">
              <h3
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  marginBottom: "1rem",
                  color: "var(--color-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Metadados
              </h3>

              <div className="form-group">
                <label className="form-label" htmlFor="author_id">
                  Autor <span style={{ color: "var(--color-secondary)" }}>*</span>
                </label>
                <select className="form-control" id="author_id" name="author_id" required defaultValue={article?.author.id ?? ""}>
                  <option value="">Selecione…</option>
                  {authors.map((aut) => (
                    <option key={aut.id} value={aut.id}>
                      {aut.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="reading_time_min">
                  Tempo de leitura (min)
                </label>
                <input
                  className="form-control"
                  type="number"
                  id="reading_time_min"
                  name="reading_time_min"
                  min={1}
                  max={120}
                  placeholder="5"
                  defaultValue={article?.reading_time_min ?? ""}
                />
              </div>
            </div>

            {/* Ações de Salvar / Publicar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", width: "100%" }}>
              {mode === "edit" ? (
                <>
                  <a
                    href="/admin"
                    className="btn-secondary"
                    style={{
                      width: "100%",
                      height: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      textAlign: "center",
                      textDecoration: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    Cancelar
                  </a>
                  <button
                    type="button"
                    onClick={handleSaveEditClick}
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{
                      width: "100%",
                      height: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      boxSizing: "border-box",
                    }}
                  >
                    {isSubmitting && submitIntent === "save_edit" ? "Salvando…" : "Salvar alterações"}
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/admin"
                    className="btn-secondary"
                    style={{
                      width: "100%",
                      height: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      textAlign: "center",
                      textDecoration: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    Cancelar
                  </a>
                  <button
                    type="button"
                    onClick={handleSaveDraftClick}
                    disabled={isSubmitting}
                    className="btn-secondary"
                    style={{
                      width: "100%",
                      height: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      boxSizing: "border-box",
                    }}
                  >
                    {isSubmitting && submitIntent === "save_draft" ? "Salvando…" : "Salvar como rascunho"}
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishClick}
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{
                      width: "100%",
                      height: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      boxSizing: "border-box",
                    }}
                  >
                    {isSubmitting && submitIntent === "publish" ? "Publicando…" : "Publicar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
