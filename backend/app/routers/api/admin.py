import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.article import Article, ArticleImage
from app.models.author import Author
from app.models.category import Category
from app.models.user import AdminUser
from app.schemas.article import ArticleCreate, ArticleListItem, ArticleOut, ArticleUpdate
from app.schemas.author import AuthorCreate, AuthorOut, AuthorUpdate
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.category import CategoryCreate, CategoryOut
from app.services import article as article_svc
from app.services.auth import authenticate_user, create_access_token, hash_password
from app.services.storage import StorageNotConfiguredError, upload_file
from app.services.text import calculate_reading_time, sanitize_html, slugify, unique_slug

ALLOWED_UPLOAD_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024
CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ─── Auth ────────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, payload.email, payload.password)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    token = create_access_token({"sub": user.email})
    return TokenResponse(access_token=token)


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    total_articles = (await db.execute(select(func.count()).select_from(Article))).scalar()
    total_published = (
        await db.execute(select(func.count()).select_from(Article).where(Article.is_published == True))
    ).scalar()
    total_authors = (await db.execute(select(func.count()).select_from(Author))).scalar()
    recent = await article_svc.get_feed(db, limit=5)

    return {
        "total_articles": total_articles,
        "total_published": total_published,
        "total_authors": total_authors,
        "recent": [ArticleListItem.model_validate(a) for a in recent],
    }


# ─── Articles ─────────────────────────────────────────────────────────────────

@router.get("/articles", response_model=list[ArticleListItem])
async def articles_list(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    result = await db.execute(
        select(Article)
        .options(selectinload(Article.author), selectinload(Article.category))
        .order_by(Article.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/articles/{article_id}", response_model=ArticleOut)
async def article_detail(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    query = (
        select(Article)
        .options(
            selectinload(Article.author),
            selectinload(Article.category),
            selectinload(Article.tags),
            selectinload(Article.images),
        )
    )
    if article_id.isdigit():
        result = await db.execute(query.where(Article.id == int(article_id)))
    else:
        result = await db.execute(query.where(Article.slug == article_id))
    article = result.scalars().first()
    if not article:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    return article


@router.post("/articles", response_model=ArticleOut, status_code=status.HTTP_201_CREATED)
async def article_create(
    payload: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    base_slug = slugify(payload.slug or payload.title)
    slug = await unique_slug(db, base_slug, Article)
    body = sanitize_html(payload.body)
    reading_time = payload.reading_time_min or calculate_reading_time(body)

    article = Article(
        title=payload.title,
        slug=slug,
        subtitle=payload.subtitle,
        chapeu=payload.chapeu,
        body=body,
        featured_image_url=payload.images[0].url if payload.images else None,
        reading_time_min=reading_time,
        is_published=payload.is_published,
        published_at=datetime.utcnow() if payload.is_published else None,
        author_id=payload.author_id,
        category_id=payload.category_id,
    )
    article.images = [
        ArticleImage(image_url=img.url, photographer=img.photographer, sort_order=order)
        for order, img in enumerate(payload.images)
    ]
    db.add(article)
    await db.commit()
    result = await db.execute(
        select(Article)
        .options(
            selectinload(Article.author),
            selectinload(Article.category),
            selectinload(Article.tags),
            selectinload(Article.images),
        )
        .where(Article.id == article.id)
    )
    return result.scalars().one()


@router.put("/articles/{article_id}", response_model=ArticleOut)
async def article_update(
    article_id: str,
    payload: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    if article_id.isdigit():
        cond = Article.id == int(article_id)
    else:
        cond = Article.slug == article_id

    result = await db.execute(
        select(Article).options(selectinload(Article.images)).where(cond)
    )
    article = result.scalars().first()
    if not article:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")

    resolved_id = article.id
    base_slug = slugify(payload.slug or payload.title)
    article.slug = await unique_slug(db, base_slug, Article, exclude_id=resolved_id)
    article.title = payload.title
    article.subtitle = payload.subtitle
    article.chapeu = payload.chapeu
    article.body = sanitize_html(payload.body)
    article.featured_image_url = payload.images[0].url if payload.images else None
    article.reading_time_min = payload.reading_time_min or calculate_reading_time(article.body)
    article.author_id = payload.author_id
    article.category_id = payload.category_id
    if payload.is_published and not article.is_published:
        article.published_at = datetime.utcnow()
    article.is_published = payload.is_published

    article.images = [
        ArticleImage(image_url=img.url, photographer=img.photographer, sort_order=order)
        for order, img in enumerate(payload.images)
    ]

    await db.commit()
    result = await db.execute(
        select(Article)
        .options(
            selectinload(Article.author),
            selectinload(Article.category),
            selectinload(Article.tags),
            selectinload(Article.images),
        )
        .where(Article.id == resolved_id)
    )
    return result.scalars().one()


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def article_delete(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    if article_id.isdigit():
        cond = Article.id == int(article_id)
    else:
        cond = Article.slug == article_id

    result = await db.execute(select(Article).where(cond))
    article = result.scalars().first()
    if article:
        await db.delete(article)
        await db.commit()
    return None


# ─── Uploads ──────────────────────────────────────────────────────────────────

@router.post("/uploads")
async def upload_image(
    file: UploadFile,
    current_user: AdminUser = Depends(get_current_admin),
):
    if file.content_type not in ALLOWED_UPLOAD_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de arquivo não suportado. Envie uma imagem JPEG, PNG, WEBP ou GIF.",
        )

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo muito grande. O tamanho máximo permitido é 8MB.",
        )

    ext = CONTENT_TYPE_EXTENSIONS[file.content_type]
    key = f"articles/{uuid.uuid4().hex}{ext}"

    try:
        url = await upload_file(key=key, content=contents, content_type=file.content_type)
    except StorageNotConfiguredError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Upload não configurado")

    return {"url": url}


# ─── Authors ──────────────────────────────────────────────────────────────────

@router.get("/authors", response_model=list[AuthorOut])
async def authors_list(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    result = await db.execute(
        select(Author).options(selectinload(Author.user)).order_by(Author.name)
    )
    return list(result.scalars().all())


@router.post("/authors", response_model=AuthorOut, status_code=status.HTTP_201_CREATED)
async def author_create(
    payload: AuthorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    existing = await db.execute(select(AdminUser).where(AdminUser.email == payload.email))
    if existing.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")

    slug = await unique_slug(db, slugify(payload.slug or payload.name), Author)
    user = AdminUser(email=payload.email, hashed_password=hash_password(payload.password), is_active=True)
    author = Author(
        name=payload.name,
        slug=slug,
        bio=payload.bio,
        photo_url=payload.photo_url,
        social_links=payload.social_links,
        role=payload.role,
        user=user,
    )
    db.add_all([user, author])
    await db.commit()
    result = await db.execute(
        select(Author).options(selectinload(Author.user)).where(Author.id == author.id)
    )
    return result.scalars().one()


@router.get("/authors/{author_id}", response_model=AuthorOut)
async def author_get(
    author_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    result = await db.execute(
        select(Author).options(selectinload(Author.user)).where(Author.id == author_id)
    )
    author = result.scalars().first()
    if not author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador não encontrado")
    return author


@router.put("/authors/{author_id}", response_model=AuthorOut)
async def author_update(
    author_id: int,
    payload: AuthorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    result = await db.execute(
        select(Author).options(selectinload(Author.user)).where(Author.id == author_id)
    )
    author = result.scalars().first()
    if not author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador não encontrado")

    if not author.user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Colaborador sem conta de login vinculada")

    if payload.email != author.user.email:
        existing = await db.execute(
            select(AdminUser).where(AdminUser.email == payload.email, AdminUser.id != author.user.id)
        )
        if existing.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")
        author.user.email = payload.email

    if payload.password:
        author.user.hashed_password = hash_password(payload.password)

    author.slug = await unique_slug(db, slugify(payload.slug or payload.name), Author, exclude_id=author_id)
    author.name = payload.name
    author.bio = payload.bio
    author.photo_url = payload.photo_url
    author.social_links = payload.social_links
    author.role = payload.role

    await db.commit()
    result = await db.execute(
        select(Author).options(selectinload(Author.user)).where(Author.id == author_id)
    )
    return result.scalars().one()


@router.delete("/authors/{author_id}", status_code=status.HTTP_204_NO_CONTENT)
async def author_delete(
    author_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    result = await db.execute(
        select(Author).options(selectinload(Author.user)).where(Author.id == author_id)
    )
    author = result.scalars().first()
    if not author:
        return None

    articles_count = await db.execute(select(func.count()).select_from(Article).where(Article.author_id == author_id))
    if articles_count.scalar_one() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível excluir um colaborador com matérias cadastradas",
        )

    user = author.user
    await db.delete(author)
    if user:
        await db.delete(user)
    await db.commit()
    return None


# ─── Categories ───────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryOut])
async def categories_list(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    return await article_svc.get_all_categories(db)


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def category_create(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    slug = await unique_slug(db, slugify(payload.slug or payload.name), Category)
    category = Category(name=payload.name, slug=slug, description=payload.description)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category
