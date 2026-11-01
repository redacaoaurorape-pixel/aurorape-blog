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
    .replace(/[\u0300-\u036f]/g, "")
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
    /(?:(?:drive|docs)\.google\.com\/(?:file\/d\/|(?:open|uc|thumbnail)\?(?:[^&]+&)*id=)|drive\.usercontent\.google\.com\/download\?(?:[^&]+&)*id=|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/
  );
  if (match) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return trimmed;
}

const BLOCK_SPLIT_RE = /(<(?:p|h[2-4]|ul|ol|blockquote|figure)\b[^>]*>[\s\S]*?<\/(?:p|h[2-4]|ul|ol|blockquote|figure)>)/gi;

function isEmptyParagraphContent(inner: string): boolean {
  if (/<img\b|<iframe\b/i.test(inner)) return false;
  return inner.replace(/(?:<br\s*\/?>|&nbsp;|\u00a0|\s)+/gi, "") === "";
}

function linesToParagraphs(lines: string[]): string {
  const res: string[] = [];
  let buf: string[] = [];
  let emptyRun = 0;

  for (const line of lines) {
    if (isEmptyParagraphContent(line)) {
      if (buf.length > 0) {
        res.push(`<p>${buf.join("<br>")}</p>`);
        buf = [];
        emptyRun = 1;
      } else {
        emptyRun += 1;
        if (emptyRun > 1) {
          res.push("<p><br></p>");
        }
      }
    } else {
      buf.push(line.replace(/\r/g, ""));
      emptyRun = 0;
    }
  }

  if (buf.length > 0) {
    res.push(`<p>${buf.join("<br>")}</p>`);
  } else if (emptyRun > 0 && res.length === 0) {
    res.push("<p><br></p>");
  }

  return res.join("");
}

export function normalizeArticleBody(html?: string | null): string {
  if (!html || !html.trim()) return "";
  let s = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.replace(
    /(<\/(?:p|div|h[2-4]|ul|ol|li|blockquote|figure|figcaption)>)[ \t]*\n+[ \t]*(?=<(?:p|div|h[2-4]|ul|ol|li|blockquote|figure|figcaption)\b)/gi,
    "$1"
  );
  s = s.replace(/<div\b(?![^>]*style=)[^>]*>/gi, "<p>");
  s = s.replace(/<\/div>/gi, "</p>");
  while (/<p\b[^>]*>\s*<p\b[^>]*>/i.test(s)) {
    s = s.replace(/<p\b[^>]*>\s*<p\b[^>]*>/gi, "<p>");
  }
  while (/<\/p>\s*<\/p>/i.test(s)) {
    s = s.replace(/<\/p>\s*<\/p>/gi, "</p>");
  }

  const parts = s.split(BLOCK_SPLIT_RE);
  const out: string[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (/^<(?:p|h[2-4]|ul|ol|blockquote|figure)\b/i.test(part)) {
      const m = part.match(/^<p\b[^>]*>([\s\S]*)<\/p>$/i);
      if (m) {
        const inner = m[1].replace(/^\n+|\n+$/g, "");
        if (isEmptyParagraphContent(inner)) {
          out.push("<p><br></p>");
        } else if (inner.includes("\n")) {
          out.push(linesToParagraphs(inner.split("\n")));
        } else {
          out.push(`<p>${inner}</p>`);
        }
      } else {
        out.push(part);
      }
    } else {
      if (isEmptyParagraphContent(part)) {
        const extraLines = (part.match(/\n/g)?.length ?? 0) - 1;
        for (let i = 0; i < Math.max(0, extraLines); i++) {
          out.push("<p><br></p>");
        }
        continue;
      }
      out.push(linesToParagraphs(part.replace(/^\n+|\n+$/g, "").split("\n")));
    }
  }

  return out.join("");
}

export function normalizeHtmlImages(html?: string | null): string {
  if (!html) return "";
  const normalizedBody = normalizeArticleBody(html);
  // shortcut: regex replacement covers standard src attributes, enough until an AST parser is needed
  return normalizedBody.replace(
    /(<img\s+[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (_match, before, src, after) => `${before}${normalizeImageUrl(src)}${after}`
  );
}
