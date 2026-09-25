import pytest
from sqlalchemy import select

from app.models.article import ArticleImage


@pytest.mark.asyncio
async def test_admin_login_invalid(client, seed_data):
    response = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": "admin@aurorape.com", "password": "errada"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_login_valid(client, seed_data):
    response = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": "admin@aurorape.com", "password": "senha123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_admin_dashboard(auth_client, seed_data):
    response = await auth_client.get("/api/v1/admin/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["total_articles"] == 1
    assert data["total_authors"] == 1


@pytest.mark.asyncio
async def test_admin_articles_list(auth_client, seed_data):
    response = await auth_client.get("/api/v1/admin/articles")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Primeira matéria de teste"


@pytest.mark.asyncio
async def test_admin_article_create(auth_client, seed_data):
    payload = {
        "title": "Nova Matéria Admin",
        "slug": "nova-materia-admin",
        "subtitle": "Subtítulo",
        "chapeu": "Geral",
        "body": "<p>Conteúdo novo</p>",
        "author_id": seed_data["author"].id,
        "category_id": seed_data["category"].id,
        "is_published": True
    }
    response = await auth_client.post("/api/v1/admin/articles", json=payload)
    assert response.status_code == 201
    assert response.json()["title"] == "Nova Matéria Admin"


@pytest.mark.asyncio
async def test_admin_article_create_with_images(auth_client, seed_data):
    payload = {
        "title": "Matéria com Imagens",
        "slug": "materia-com-imagens",
        "body": "<p>Conteúdo</p>",
        "author_id": seed_data["author"].id,
        "category_id": seed_data["category"].id,
        "is_published": True,
        "images": [
            {"url": "https://example.com/foto1.jpg", "photographer": "Ana Souza"},
            {"url": "https://example.com/foto2.jpg"},
        ],
    }
    response = await auth_client.post("/api/v1/admin/articles", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["featured_image_url"] == "https://example.com/foto1.jpg"
    assert len(data["images"]) == 2
    assert data["images"][0]["image_url"] == "https://example.com/foto1.jpg"
    assert data["images"][0]["photographer"] == "Ana Souza"
    assert data["images"][0]["sort_order"] == 0
    assert data["images"][1]["image_url"] == "https://example.com/foto2.jpg"
    assert data["images"][1]["photographer"] is None
    assert data["images"][1]["sort_order"] == 1


@pytest.mark.asyncio
async def test_admin_article_create_without_images(auth_client, seed_data):
    payload = {
        "title": "Matéria sem Imagens",
        "slug": "materia-sem-imagens",
        "body": "<p>Conteúdo</p>",
        "author_id": seed_data["author"].id,
        "category_id": seed_data["category"].id,
        "is_published": True,
    }
    response = await auth_client.post("/api/v1/admin/articles", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["featured_image_url"] is None
    assert data["images"] == []


@pytest.mark.asyncio
async def test_admin_article_update(auth_client, seed_data):
    article_id = seed_data["article"].id
    payload = {
        "title": "Título Atualizado",
        "slug": "titulo-atualizado",
        "subtitle": "Novo sub",
        "chapeu": "Editado",
        "body": "<p>Corpo atualizado</p>",
        "author_id": seed_data["author"].id,
        "category_id": seed_data["category"].id,
        "is_published": True
    }
    response = await auth_client.put(f"/api/v1/admin/articles/{article_id}", json=payload)
    assert response.status_code == 200
    assert response.json()["title"] == "Título Atualizado"


@pytest.mark.asyncio
async def test_admin_article_update_replaces_image_list(auth_client, seed_data, db_session):
    article_id = seed_data["article"].id
    create_payload = {
        "title": "Título Atualizado",
        "slug": "titulo-atualizado",
        "body": "<p>Corpo</p>",
        "author_id": seed_data["author"].id,
        "category_id": seed_data["category"].id,
        "is_published": True,
        "images": [
            {"url": "https://example.com/a.jpg", "photographer": "Fotógrafo A"},
            {"url": "https://example.com/b.jpg", "photographer": "Fotógrafo B"},
        ],
    }
    first = await auth_client.put(f"/api/v1/admin/articles/{article_id}", json=create_payload)
    assert first.status_code == 200
    assert len(first.json()["images"]) == 2

    update_payload = {**create_payload, "images": [{"url": "https://example.com/c.jpg"}]}
    second = await auth_client.put(f"/api/v1/admin/articles/{article_id}", json=update_payload)
    assert second.status_code == 200
    data = second.json()
    assert len(data["images"]) == 1
    assert data["images"][0]["image_url"] == "https://example.com/c.jpg"
    assert data["featured_image_url"] == "https://example.com/c.jpg"

    remaining = await db_session.execute(select(ArticleImage).where(ArticleImage.article_id == article_id))
    urls = [row.image_url for row in remaining.scalars().all()]
    assert urls == ["https://example.com/c.jpg"]


@pytest.mark.asyncio
async def test_admin_article_delete(auth_client, seed_data):
    article_id = seed_data["article"].id
    response = await auth_client.delete(f"/api/v1/admin/articles/{article_id}")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_admin_article_delete_cascades_images(auth_client, seed_data, db_session):
    article_id = seed_data["article"].id
    payload = {
        "title": seed_data["article"].title,
        "slug": seed_data["article"].slug,
        "body": "<p>Corpo</p>",
        "author_id": seed_data["author"].id,
        "category_id": seed_data["category"].id,
        "is_published": True,
        "images": [{"url": "https://example.com/foto.jpg"}],
    }
    updated = await auth_client.put(f"/api/v1/admin/articles/{article_id}", json=payload)
    assert len(updated.json()["images"]) == 1

    response = await auth_client.delete(f"/api/v1/admin/articles/{article_id}")
    assert response.status_code == 204

    remaining = await db_session.execute(select(ArticleImage).where(ArticleImage.article_id == article_id))
    assert remaining.scalars().first() is None
