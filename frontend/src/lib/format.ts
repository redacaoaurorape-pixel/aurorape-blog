export function formatDate(iso?: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", options ?? { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso)
  );
}

export function formatDateLong(iso?: string | null): string {
  return formatDate(iso, { day: "numeric", month: "long", year: "numeric" });
}

export function formatToday(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function toSlug(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function normalizeImageUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  // shortcut: regex parses common Google Drive share links; upgrade to official Google Drive API if private links are needed
  const match = trimmed.match(
    /(?:(?:drive|docs)\.google\.com\/(?:file\/d\/|(?:open|uc|thumbnail)\?(?:[^&]+&)*id=)|drive\.usercontent\.google\.com\/download\?(?:[^&]+&)*id=)([a-zA-Z0-9_-]+)/
  );
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
  }
  return trimmed;
}

export function normalizeHtmlImages(html?: string | null): string {
  if (!html) return "";
  // shortcut: regex replacement covers standard src attributes, enough until an AST parser is needed
  return html.replace(
    /(<img\s+[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (_match, before, src, after) => `${before}${normalizeImageUrl(src)}${after}`
  );
}
