from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import NewsletterSubscriber
from app.schemas.article import ArticleListItem, ArticleOut, HomeResponse
from app.schemas.author import AuthorOut
from app.schemas.category import CategoryOut
from app.schemas.common import PaginatedResponse
from app.schemas.newsletter import NewsletterSubscribeRequest, NewsletterSubscribeResponse
from app.services import article as article_svc

router = APIRouter(prefix="/api/v1", tags=["public"])


@router.get("/home", response_model=HomeResponse)
async def home(db: AsyncSession = Depends(get_db)):
    hero = await article_svc.get_hero(db)
    hero_id = hero.id if hero else None
    secondary = await article_svc.get_secondary(db, exclude_id=hero_id, limit=4)
    secondary_ids = [a.id for a in secondary] + ([hero_id] if hero_id else [])
    feed = await article_svc.get_feed(db, exclude_ids=secondary_ids, limit=10)
    return HomeResponse(hero=hero, secondary=secondary, feed=feed)


@router.get("/categories", response_model=list[CategoryOut])
async def categories(db: AsyncSession = Depends(get_db)):
    return await article_svc.get_all_categories(db)


@router.get("/categories/{slug}/articles", response_model=PaginatedResponse[ArticleListItem])
async def category_articles(slug: str, page: int = Query(1, ge=1), db: AsyncSession = Depends(get_db)):
    all_categories = await article_svc.get_all_categories(db)
    cat = next((c for c in all_categories if c.slug == slug), None)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    limit = 12
    offset = (page - 1) * limit
    items = await article_svc.get_feed(db, category_slug=slug, limit=limit, offset=offset)
    return PaginatedResponse(items=items, total=len(items), page=page, page_size=limit)


@router.get("/articles", response_model=list[ArticleListItem])
async def articles_list(limit: int = Query(500, le=1000), db: AsyncSession = Depends(get_db)):
    # Usado pelo frontend para montar o sitemap dinamicamente.
    return await article_svc.get_feed(db, limit=limit)


@router.get("/articles/trending", response_model=list[ArticleListItem])
async def articles_trending(limit: int = Query(3, ge=1, le=20), db: AsyncSession = Depends(get_db)):
    return await article_svc.get_trending_articles(db, limit=limit)


@router.get("/articles/{slug}", response_model=ArticleOut)
async def article_detail(slug: str, db: AsyncSession = Depends(get_db)):
    art = await article_svc.get_article_by_slug(db, slug)
    if not art:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    return art


@router.post("/articles/{slug}/view", status_code=status.HTTP_204_NO_CONTENT)
async def increment_article_view(slug: str, db: AsyncSession = Depends(get_db)):
    success = await article_svc.increment_article_views(db, slug)
    if not success:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    return None


@router.get("/articles/{slug}/related", response_model=list[ArticleListItem])
async def article_related(slug: str, db: AsyncSession = Depends(get_db)):
    art = await article_svc.get_article_by_slug(db, slug)
    if not art:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    return await article_svc.get_related(db, art)


@router.get("/authors/{slug}", response_model=AuthorOut)
async def author_detail(slug: str, db: AsyncSession = Depends(get_db)):
    author = await article_svc.get_author_by_slug(db, slug)
    if not author:
        raise HTTPException(status_code=404, detail="Autor não encontrado")
    return author


@router.get("/search", response_model=list[ArticleListItem])
async def search(q: str = "", db: AsyncSession = Depends(get_db)):
    if not q or len(q) < 2:
        return []
    return await article_svc.search_articles(db, q)


@router.post("/newsletter", response_model=NewsletterSubscribeResponse)
async def newsletter_subscribe(payload: NewsletterSubscribeRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == payload.email)
    )
    if not existing.scalars().first():
        db.add(NewsletterSubscriber(email=payload.email))
        await db.commit()

    return NewsletterSubscribeResponse(message="Obrigado! Você receberá nossas novidades em breve.")
