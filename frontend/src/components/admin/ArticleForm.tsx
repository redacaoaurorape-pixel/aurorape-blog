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
    updateImage(key, { uploading: true, uploadError: null });
    const formData = new FormData();
    formData.append("file", file);
    startUploadTransition(async () => {
      const result = await uploadArticleImageAction(formData);
      if ("error" in result) {
        updateImage(key, { uploading: false, uploadError: result.error });
      } else {
        updateImage(key, { uploading: false, uploadError: null, url: result.url, previewError: false });
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
      setStatusWarning("Por favor, selecione uma categoria.");
      categorySelect?.focus();
      return false;
    }

    const authorSelect = formRef.current?.querySelector<HTMLSelectElement>("#author_id");
    if (!authorSelect?.value) {
      setStatusWarning("Por favor, selecione um autor.");
      authorSelect?.focus();
      return false;
    }

    const plainText = editorRef.current?.innerText?.trim() ?? "";
    const htmlText = editorRef.current?.innerHTML ?? "";
    if (!plainText && !htmlText.includes("<img")) {
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
                <label className="form-label" htmlFor="chapeu">
                  Chapéu <span className="form-hint">Linha de editoria acima do título (ex: Política, Exclusivo)</span>
                </label>
                <input
                  className="form-control"
                  type="text"
                  id="chapeu"
                  name="chapeu"
                  placeholder="Ex: Política"
                  maxLength={80}
                  defaultValue={article?.chapeu ?? ""}
                />
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
                <label className="form-label" htmlFor="category_id">
                  Categoria <span style={{ color: "var(--color-secondary)" }}>*</span>
                </label>
                <select className="form-control" id="category_id" name="category_id" required defaultValue={article?.category.id ?? ""}>
                  <option value="">Selecione…</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

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

            <div className="card form-section">
              <h3
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  color: "var(--color-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Imagens
              </h3>
              <p className="form-hint" style={{ marginBottom: "0.875rem" }}>
                A primeira imagem da lista vira a capa da matéria. Nenhuma imagem é obrigatória.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {images.map((img, index) => (
                  <div
                    key={img.key}
                    style={{ border: "1px solid var(--color-border)", borderRadius: 6, padding: "0.75rem" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.625rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "var(--color-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Imagem {index + 1}
                        {index === 0 ? " (capa)" : ""}
                      </span>
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

                    <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.625rem" }}>
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

                    {img.mode === "url" ? (
                      <div className="form-group" style={{ marginBottom: "0.625rem" }}>
                        <input
                          className="form-control"
                          type="url"
                          placeholder="https://…"
                          value={img.url}
                          onChange={(e) => updateImage(img.key, { url: e.target.value, previewError: false })}
                        />
                      </div>
                    ) : (
                      <div className="form-group" style={{ marginBottom: "0.625rem" }}>
                        <input
                          className="form-control"
                          type="file"
                          accept="image/*"
                          disabled={img.uploading}
                          onChange={(e) => handleImageFile(img.key, e.target.files?.[0])}
                        />
                        {img.uploading && <p className="form-hint">Enviando…</p>}
                        {img.uploadError && (
                          <p style={{ color: "var(--color-secondary)", fontSize: "0.75rem", marginTop: "0.375rem" }}>
                            {img.uploadError}
                          </p>
                        )}
                        {!img.uploading && !img.uploadError && img.url && (
                          <p className="form-hint">Arquivo enviado.</p>
                        )}
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: "0.625rem" }}>
                      <input
                        className="form-control"
                        type="text"
                        placeholder="Fotógrafo (opcional)"
                        value={img.photographer}
                        onChange={(e) => updateImage(img.key, { photographer: e.target.value })}
                      />
                    </div>

                    <div className={`img-preview${img.url && !img.previewError ? " has-img" : ""}`}>
                      {img.url && !img.previewError && (
                        <img
                          src={img.url}
                          alt={`Pré-visualização da imagem ${index + 1}`}
                          onError={() => updateImage(img.key, { previewError: true })}
                        />
                      )}
                      {img.url && img.previewError && (
                        <div
                          style={{
                            padding: "1rem",
                            textAlign: "center",
                            color: "var(--color-secondary)",
                            fontSize: "0.8rem",
                          }}
                        >
                          Imagem inacessível ou link inválido. Verifique se o endereço é público e direto.
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {images.length === 0 && (
                  <p className="form-hint" style={{ margin: 0 }}>
                    Nenhuma imagem adicionada ainda.
                  </p>
                )}
              </div>

              <button
                type="button"
                className="btn-secondary"
                style={{ width: "100%", marginTop: "1rem" }}
                onClick={addImage}
              >
                + Adicionar imagem
              </button>

              <input type="hidden" name="images_json" value={imagesJsonValue} readOnly />
            </div>

            {/* Ações abaixo da URL da Imagem */}
            <div className="form-actions">
              {mode === "edit" ? (
                <>
                  <button
                    type="button"
                    onClick={handleSaveEditClick}
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{ width: "100%", fontWeight: 600, padding: "0.625rem 1rem", textAlign: "center" }}
                  >
                    {isSubmitting && submitIntent === "save_edit" ? "Salvando…" : "Salvar alterações"}
                  </button>
                  <a href="/admin" className="btn-secondary" style={{ width: "100%", textAlign: "center", opacity: 0.8 }}>
                    Cancelar
                  </a>
                </>
              ) : (
                <>
                  <a href="/admin" className="btn-secondary" style={{ width: "100%", textAlign: "center", opacity: 0.8 }}>
                    Cancelar
                  </a>
                  <button
                    type="button"
                    onClick={handleSaveDraftClick}
                    disabled={isSubmitting}
                    className="btn-secondary"
                    style={{ width: "100%", fontWeight: 600, padding: "0.625rem 1rem", textAlign: "center" }}
                  >
                    {isSubmitting && submitIntent === "save_draft" ? "Salvando…" : "Salvar como rascunho"}
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishClick}
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{ width: "100%", fontWeight: 600, padding: "0.625rem 1rem", textAlign: "center" }}
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
