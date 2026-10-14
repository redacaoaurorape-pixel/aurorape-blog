import re
import unicodedata

import bleach
from sqlalchemy import select

ALLOWED_TAGS = [
    "p", "h2", "h3", "h4", "strong", "em", "b", "i", "u",
    "a", "ul", "ol", "li", "blockquote", "br", "img",
]
ALLOWED_ATTRS = {"a": ["href", "title", "rel", "target"], "img": ["src", "alt"]}


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    return re.sub(r"[-\s]+", "-", value)


async def unique_slug(db, base_slug: str, model, exclude_id: int | None = None) -> str:
    slug = base_slug
    suffix = 2
    while True:
        query = select(model.id).where(model.slug == slug)
        if exclude_id is not None:
            query = query.where(model.id != exclude_id)
        result = await db.execute(query)
        if not result.scalars().first():
            return slug
        slug = f"{base_slug}-{suffix}"
        suffix += 1


def calculate_reading_time(html_body: str, words_per_minute: int = 200) -> int:
    text = re.sub(r"<[^>]+>", " ", html_body)
    words = len(text.split())
    return max(1, -(-words // words_per_minute))  # divisão com arredondamento para cima


def sanitize_html(html: str) -> str:
    cleaned = bleach.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=True)
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
        r"(?:(?:drive|docs)\.google\.com\/(?:file\/d\/|(?:open|uc|thumbnail)\?(?:[^&]+&)*id=)|drive\.usercontent\.google\.com\/download\?(?:[^&]+&)*id=)([a-zA-Z0-9_-]+)",
        url,
    )
    if match:
        return f"https://drive.google.com/thumbnail?id={match.group(1)}&sz=w1600"
    return url
