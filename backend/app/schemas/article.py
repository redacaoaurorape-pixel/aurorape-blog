from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.author import AuthorMini
from app.schemas.category import CategoryOut


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str


class ArticleImageIn(BaseModel):
    url: str
    photographer: str | None = None


class ArticleImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    photographer: str | None = None
    sort_order: int


class ArticleListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    subtitle: str | None = None
    chapeu: str | None = None
    featured_image_url: str | None = None
    reading_time_min: int
    is_published: bool
    published_at: datetime | None = None
    author: AuthorMini
    category: CategoryOut


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
