import re
import unicodedata

import bleach
from sqlalchemy import select

ALLOWED_TAGS = [
    "p", "h2", "h3", "h4", "strong", "em", "b", "i", "u",
    "a", "ul", "ol", "li", "blockquote", "br", "img",
    "figure", "figcaption",
]
ALLOWED_ATTRS = {"a": ["href", "title", "rel", "target"], "img": ["src", "alt"]}

_BLOCK_TAG_NAMES = "p|h[2-4]|ul|ol|blockquote|figure"
_BLOCK_SPLIT_RE = re.compile(
    rf"(<(?:{_BLOCK_TAG_NAMES})\b[^>]*>.*?</(?:{_BLOCK_TAG_NAMES})>)",
    re.IGNORECASE | re.DOTALL,
)
_NON_IMAGE_EXT_RE = re.compile(
    r"\.(?:pdf|doc|docx|xls|xlsx|ppt|pptx|mp4|mov|avi|mkv|mp3|wav|zip|rar|7z|txt|csv|json)$",
    re.IGNORECASE,
)


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    return re.sub(r"[-\s]+", "-", value)


async def unique_slug(db, base_slug: str, model, exclude_id: int | None = None) -> str:
    query = select(model.slug).where(
        (model.slug == base_slug) | model.slug.like(f"{base_slug}-%")
    )
    if exclude_id is not None:
        query = query.where(model.id != exclude_id)
    existing = set((await db.execute(query)).scalars().all())
    if base_slug not in existing:
        return base_slug
    suffix = 2
    while f"{base_slug}-{suffix}" in existing:
        suffix += 1
    return f"{base_slug}-{suffix}"


def calculate_reading_time(html_body: str, words_per_minute: int = 200) -> int:
    text = re.sub(r"<[^>]+>", " ", html_body)
    words = len(text.split())
    return max(1, -(-words // words_per_minute))  # divisão com arredondamento para cima


def _is_empty_paragraph_content(inner: str) -> bool:
    if re.search(r"<img\b", inner, re.IGNORECASE):
        return False
    stripped = re.sub(r"(?:<br\s*/?>|&nbsp;|\u00a0|\s)+", "", inner, flags=re.IGNORECASE)
    return stripped == ""


def _lines_to_paragraphs(lines: list[str]) -> str:
    res: list[str] = []
    buf: list[str] = []
    empty_run = 0
    for line in lines:
        if _is_empty_paragraph_content(line):
            if buf:
                res.append("<p>" + "<br>".join(buf) + "</p>")
                buf = []
                empty_run = 1
            else:
                empty_run += 1
                if empty_run > 1:
                    res.append("<p><br></p>")
        else:
            buf.append(line.strip("\r"))
            empty_run = 0
    if buf:
        res.append("<p>" + "<br>".join(buf) + "</p>")
    elif empty_run > 0 and not res:
        res.append("<p><br></p>")
    return "".join(res)


def normalize_paragraphs(html: str) -> str:
    if not html or not html.strip():
        return ""
    s = html.replace("\r\n", "\n").replace("\r", "\n")
    # Remove indentation/newlines that sit strictly between closing and opening block tags
    s = re.sub(
        r"(</(?:p|div|h[2-4]|ul|ol|li|blockquote|figure|figcaption)>)[ \t]*\n+[ \t]*(?=<(?:p|div|h[2-4]|ul|ol|li|blockquote|figure|figcaption)\b)",
        r"\1",
        s,
        flags=re.IGNORECASE,
    )
    # Convert contentEditable <div> blocks to <p> and flatten nested <p> tags
    s = re.sub(r"<div\b[^>]*>", "<p>", s, flags=re.IGNORECASE)
    s = re.sub(r"</div>", "</p>", s, flags=re.IGNORECASE)
    while re.search(r"<p\b[^>]*>\s*<p\b[^>]*>", s, flags=re.IGNORECASE):
        s = re.sub(r"<p\b[^>]*>\s*<p\b[^>]*>", "<p>", s, flags=re.IGNORECASE)
    while re.search(r"</p>\s*</p>", s, flags=re.IGNORECASE):
        s = re.sub(r"</p>\s*</p>", "</p>", s, flags=re.IGNORECASE)

    parts = _BLOCK_SPLIT_RE.split(s)
    out: list[str] = []
    for part in parts:
        if not part:
            continue
        if _BLOCK_SPLIT_RE.match(part):
            m = re.match(r"^<p\b[^>]*>(.*)</p>$", part, flags=re.IGNORECASE | re.DOTALL)
            if m is not None:
                inner = m.group(1).strip("\n")
                if _is_empty_paragraph_content(inner):
                    out.append("<p><br></p>")
                elif "\n" in inner:
                    out.append(_lines_to_paragraphs(inner.split("\n")))
                else:
                    out.append(f"<p>{inner}</p>")
            else:
                out.append(part)
        else:
            if _is_empty_paragraph_content(part):
                extra_lines = part.count("\n") - 1
                for _ in range(max(0, extra_lines)):
                    out.append("<p><br></p>")
                continue
            out.append(_lines_to_paragraphs(part.strip("\n").split("\n")))
    return "".join(out)


def sanitize_html(html: str) -> str:
    normalized = normalize_paragraphs(html)
    cleaned = bleach.clean(normalized, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=True)
    cleaned = re.sub(r"<p>\s*</p>", "<p><br></p>", cleaned, flags=re.IGNORECASE)
    # shortcut: regex replacement covers standard src attributes, enough until an AST parser is needed
    return re.sub(
        r'(<img\s+[^>]*src=["\'])([^"\']+)(["\'][^>]*>)',
        lambda m: f"{m.group(1)}{normalize_image_url(m.group(2))}{m.group(3)}",
        cleaned,
        flags=re.IGNORECASE,
    )


def normalize_image_url(url: str | None) -> str | None:
    if not url:
        return url
    # shortcut: regex parses common Google Drive share links; upgrade to official Google Drive API if private links are needed
    match = re.search(
        r"(?:(?:drive|docs)\.google\.com\/(?:file\/d\/|(?:open|uc|thumbnail)\?(?:[^&]+&)*id=)|drive\.usercontent\.google\.com\/download\?(?:[^&]+&)*id=|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)",
        url,
    )
    if match:
        return f"https://lh3.googleusercontent.com/d/{match.group(1)}"
    return url


def extract_drive_folder_id(url: str | None) -> str | None:
    if not url:
        return None
    match = re.search(
        r"drive\.google\.com\/(?:drive\/(?:u\/\d+\/|mobile\/)?folders\/|embeddedfolderview\?(?:[^#&]*&)*id=|open\?(?:[^#&]*&)*id=)([a-zA-Z0-9_-]+)",
        url.strip(),
    )
    return match.group(1) if match else None


def parse_drive_folder_html(html: str, folder_id: str | None = None) -> list[str]:
    if not html:
        return []
    file_ids: list[str] = []
    seen: set[str] = {folder_id} if folder_id else set()

    def _add(fid: str) -> None:
        if fid and fid not in seen:
            seen.add(fid)
            file_ids.append(fid)

    # 1. Google Drive embeddedfolderview entries (<div class="flip-entry" id="entry-FILE_ID">)
    if "flip-entry" in html:
        for chunk in html.split('class="flip-entry"')[1:]:
            if "/drive/folders/" in chunk:
                continue
            type_match = re.search(r"/type/([a-zA-Z0-9.+_-]+/[a-zA-Z0-9.+_-]+)", chunk)
            if type_match and not type_match.group(1).lower().startswith("image/"):
                continue
            title_match = re.search(r'class="flip-entry-title"[^>]*>([^<]+)<', chunk)
            if title_match and _NON_IMAGE_EXT_RE.search(title_match.group(1).strip()):
                continue
            id_match = re.search(r'id="entry-([a-zA-Z0-9_-]+)"', chunk) or re.search(
                r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)", chunk
            )
            if id_match:
                _add(id_match.group(1))
        if file_ids:
            return [f"https://lh3.googleusercontent.com/d/{fid}" for fid in file_ids]

    # 2. Fallback: unescape Drive folder page HTML / scripts and extract image file IDs
    unescaped = (
        html.replace(r"\x22", '"')
        .replace(r"\u0022", '"')
        .replace(r"\/", "/")
        .replace("&quot;", '"')
    )
    for m in re.finditer(r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)", unescaped):
        _add(m.group(1))

    for m in re.finditer(
        r'\["([a-zA-Z0-9_-]{15,})"\s*,\s*\[[^\]]*?\](?:(?!\["[a-zA-Z0-9_-]{15,}").){0,400}?"image/[a-zA-Z0-9.+-]+"',
        unescaped,
        flags=re.DOTALL,
    ):
        _add(m.group(1))

    return [f"https://lh3.googleusercontent.com/d/{fid}" for fid in file_ids]
