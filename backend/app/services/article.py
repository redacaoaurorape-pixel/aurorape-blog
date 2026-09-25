from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.article import Article
from app.models.author import Author
from app.models.category import Category


async def get_hero(db: AsyncSession) -> Article | None:
    result = await db.execute(
        select(Article)
        .where(Article.is_published == True)
        .options(selectinload(Article.author), selectinload(Article.category))
        .order_by(Article.published_at.desc())
        .limit(1)
    )
    return result.scalars().first()


async def get_secondary(db: AsyncSession, exclude_id: int | None = None, limit: int = 4) -> list[Article]:
    q = (
        select(Article)
        .where(Article.is_published == True)
        .options(selectinload(Article.author), selectinload(Article.category))
        .order_by(Article.published_at.desc())
        .limit(limit)
    )
    if exclude_id:
        q = q.where(Article.id != exclude_id)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_feed(
    db: AsyncSession,
    exclude_ids: list[int] | None = None,
    category_slug: str | None = None,
    limit: int = 10,
    offset: int = 0,
) -> list[Article]:
    q = (
        select(Article)
        .where(Article.is_published == True)
        .options(
            selectinload(Article.author),
            selectinload(Article.category),
        )
        .order_by(Article.published_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if exclude_ids:
        q = q.where(Article.id.not_in(exclude_ids))
    if category_slug:
        q = q.join(Category).where(Category.slug == category_slug)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_article_by_slug(db: AsyncSession, slug: str) -> Article | None:
    result = await db.execute(
        select(Article)
        .where(Article.slug == slug, Article.is_published == True)
        .options(
            selectinload(Article.author),
            selectinload(Article.category),
            selectinload(Article.tags),
            selectinload(Article.images),
        )
    )
    return result.scalars().first()


async def get_related(db: AsyncSession, article: Article, limit: int = 3) -> list[Article]:
    result = await db.execute(
        select(Article)
        .where(
            Article.is_published == True,
            Article.id != article.id,
            Article.category_id == article.category_id,
        )
        .options(selectinload(Article.author), selectinload(Article.category))
        .order_by(Article.published_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def search_articles(db: AsyncSession, query: str, limit: int = 8) -> list[Article]:
    q = f"%{query}%"
    result = await db.execute(
        select(Article)
        .where(
            Article.is_published == True,
            or_(
                Article.title.ilike(q),
                Article.subtitle.ilike(q),
                Article.chapeu.ilike(q),
            ),
        )
        .options(selectinload(Article.author), selectinload(Article.category))
        .order_by(Article.published_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_all_categories(db: AsyncSession) -> list[Category]:
    stmt = (
        select(
            Category,
            func.count(Article.id).label("article_count"),
        )
        .outerjoin(
            Article,
            and_(
                Article.category_id == Category.id,
                Article.is_published == True,
            ),
        )
        .group_by(Category.id)
        .order_by(Category.name)
    )
    result = await db.execute(stmt)
    categories = []
    for cat, count in result.all():
        cat.article_count = count
        categories.append(cat)
    return categories


async def get_author_by_slug(db: AsyncSession, slug: str) -> Author | None:
    result = await db.execute(select(Author).where(Author.slug == slug))
    return result.scalars().first()
