import pytest

from app.services.storage import StorageNotConfiguredError


@pytest.mark.asyncio
async def test_upload_success(auth_client, seed_data, monkeypatch):
    async def fake_upload_file(key: str, content: bytes, content_type: str) -> str:
        return f"https://cdn.example.com/{key}"

    monkeypatch.setattr("app.routers.api.admin.upload_file", fake_upload_file)

    response = await auth_client.post(
        "/api/v1/admin/uploads",
        files={"file": ("foto.jpg", b"fake-image-bytes", "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["url"].startswith("https://cdn.example.com/articles/")
    assert data["url"].endswith(".jpg")


@pytest.mark.asyncio
async def test_upload_invalid_content_type(auth_client, seed_data, monkeypatch):
    async def fake_upload_file(key: str, content: bytes, content_type: str) -> str:
        raise AssertionError("upload_file não deveria ser chamado para tipo inválido")

    monkeypatch.setattr("app.routers.api.admin.upload_file", fake_upload_file)

    response = await auth_client.post(
        "/api/v1/admin/uploads",
        files={"file": ("arquivo.txt", b"conteudo", "text/plain")},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_too_large(auth_client, seed_data, monkeypatch):
    async def fake_upload_file(key: str, content: bytes, content_type: str) -> str:
        raise AssertionError("upload_file não deveria ser chamado para arquivo grande demais")

    monkeypatch.setattr("app.routers.api.admin.upload_file", fake_upload_file)

    oversized = b"0" * (8 * 1024 * 1024 + 1)
    response = await auth_client.post(
        "/api/v1/admin/uploads",
        files={"file": ("foto.jpg", oversized, "image/jpeg")},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_unauthenticated(client, seed_data):
    response = await client.post(
        "/api/v1/admin/uploads",
        files={"file": ("foto.jpg", b"fake-image-bytes", "image/jpeg")},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_not_configured(auth_client, seed_data, monkeypatch):
    async def fake_upload_file(key: str, content: bytes, content_type: str) -> str:
        raise StorageNotConfiguredError("BUCKET_ENDPOINT_URL não está configurada")

    monkeypatch.setattr("app.routers.api.admin.upload_file", fake_upload_file)

    response = await auth_client.post(
        "/api/v1/admin/uploads",
        files={"file": ("foto.jpg", b"fake-image-bytes", "image/jpeg")},
    )
    assert response.status_code == 500
    assert response.json()["detail"] == "Upload não configurado"
