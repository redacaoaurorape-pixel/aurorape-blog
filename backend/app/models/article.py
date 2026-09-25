from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

article_tags = Table(
    "article_tags",
    Base.metadata,
    Column("article_id", Integer, ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    articles: Mapped[list["Article"]] = relationship(
        "Article", secondary=article_tags, back_populates="tags"
    )


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    slug: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    subtitle: Mapped[str | None] = mapped_column(String(500))
    chapeu: Mapped[str | None] = mapped_column(String(100))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    featured_image_url: Mapped[str | None] = mapped_column(String(500))
    reading_time_min: Mapped[int] = mapped_column(Integer, default=1)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)

    author: Mapped["Author"] = relationship("Author", back_populates="articles")
    category: Mapped["Category"] = relationship("Category", back_populates="articles")
    tags: Mapped[list["Tag"]] = relationship(
        "Tag", secondary=article_tags, back_populates="articles"
    )
    images: Mapped[list["ArticleImage"]] = relationship(
        "ArticleImage",
        back_populates="article",
        cascade="all, delete-orphan",
        order_by="ArticleImage.sort_order",
    )

    def __repr__(self) -> str:
        return f"<Article {self.slug}>"


class ArticleImage(Base):
    __tablename__ = "article_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[int] = mapped_column(
        ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    photographer: Mapped[str | None] = mapped_column(String(200))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    article: Mapped["Article"] = relationship("Article", back_populates="images")

    def __repr__(self) -> str:
        return f"<ArticleImage {self.id} article_id={self.article_id}>"
