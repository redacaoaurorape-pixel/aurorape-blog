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


@pytest.mark.asyncio
async def test_upload_local_fallback(auth_client, seed_data, monkeypatch):
    monkeypatch.setattr("app.config.BUCKET_ENDPOINT_URL", "")

    response = await auth_client.post(
        "/api/v1/admin/uploads",
        files={"file": ("foto.jpg", b"fake-local-image-bytes", "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "/uploads/articles/" in data["url"]
    assert data["url"].endswith(".jpg")

    url_path = data["url"].split("/uploads/", 1)[1]
    static_resp = await auth_client.get(f"/uploads/{url_path}")
    assert static_resp.status_code == 200
    assert static_resp.content == b"fake-local-image-bytes"


@pytest.mark.asyncio
async def test_import_drive_folder_success(auth_client, seed_data, monkeypatch):
    sample_html = """
    <div class="flip-entry" id="entry-imgFile111">
      <a href="https://drive.google.com/file/d/imgFile111/view">
        <div class="flip-entry-list-icon"><img src="https://drive-thirdparty.googleusercontent.com/16/type/image/jpeg" /></div>
        <div class="flip-entry-title">foto1.jpg</div>
      </a>
    </div>
    <div class="flip-entry" id="entry-docFile222">
      <a href="https://drive.google.com/file/d/docFile222/view">
        <div class="flip-entry-list-icon"><img src="https://drive-thirdparty.googleusercontent.com/16/type/application/pdf" /></div>
        <div class="flip-entry-title">documento.pdf</div>
      </a>
    </div>
    <div class="flip-entry" id="entry-imgFile333">
      <a href="https://drive.google.com/file/d/imgFile333/view">
        <div class="flip-entry-list-icon"><img src="https://drive-thirdparty.googleusercontent.com/16/type/image/png" /></div>
        <div class="flip-entry-title">foto2.png</div>
      </a>
    </div>
    """
    from app.services.text import parse_drive_folder_html

    async def fake_fetch(folder_id: str) -> list[str]:
        assert folder_id == "1FolderAbc123"
        return parse_drive_folder_html(sample_html, folder_id)

    monkeypatch.setattr("app.routers.api.admin.fetch_drive_folder_images", fake_fetch)

    response = await auth_client.post(
        "/api/v1/admin/uploads/drive-folder",
        json={"url": "https://drive.google.com/drive/folders/1FolderAbc123?usp=sharing"},
    )
    assert response.status_code == 200
    assert response.json()["urls"] == [
        "https://lh3.googleusercontent.com/d/imgFile111",
        "https://lh3.googleusercontent.com/d/imgFile333",
    ]


@pytest.mark.asyncio
async def test_import_drive_folder_invalid_url(auth_client, seed_data):
    response = await auth_client.post(
        "/api/v1/admin/uploads/drive-folder",
        json={"url": "https://example.com/not-a-drive-folder"},
    )
    assert response.status_code == 400
