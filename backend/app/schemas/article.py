from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.author import AuthorMini
from app.schemas.category import CategoryOut
from app.services.text import normalize_image_url


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str


class ArticleImageIn(BaseModel):
    url: str
    photographer: str | None = None

    @field_validator("url", mode="before")
    @classmethod
    def _normalize_url(cls, v: str) -> str:
        return normalize_image_url(v) or v


class ArticleImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    photographer: str | None = None
    sort_order: int

    @field_validator("image_url", mode="before")
    @classmethod
    def _normalize_image_url(cls, v: str) -> str:
        return normalize_image_url(v) or v


class ArticleListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    subtitle: str | None = None
    chapeu: str | None = None
    featured_image_url: str | None = None
    reading_time_min: int
    views_count: int = 0
    is_published: bool
    published_at: datetime | None = None
    author: AuthorMini
    category: CategoryOut

    @field_validator("featured_image_url", mode="before")
    @classmethod
    def _normalize_featured_image(cls, v: str | None) -> str | None:
        return normalize_image_url(v)


class ArticleOut(ArticleListItem):
    body: str
    tags: list[TagOut] = []
    images: list[ArticleImageOut] = []
    created_at: datetime
    updated_at: datetime


class ArticleCreate(BaseModel):
    title: str
    slug: str | None = None
    subtitle: str | None = None
    chapeu: str | None = None
    body: str
    images: list[ArticleImageIn] = []
    reading_time_min: int | None = None
    is_published: bool = False
    author_id: int
    category_id: int


class ArticleUpdate(ArticleCreate):
    pass


class HomeResponse(BaseModel):
    hero: ArticleListItem | None = None
    secondary: list[ArticleListItem]
    feed: list[ArticleListItem]
