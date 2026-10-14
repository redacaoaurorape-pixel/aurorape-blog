from starlette.concurrency import run_in_threadpool

from app import config


class StorageNotConfiguredError(Exception):
    """Levantada quando o endpoint de upload é chamado sem o bucket configurado."""


def _build_client():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=config.BUCKET_ENDPOINT_URL,
        aws_access_key_id=config.BUCKET_ACCESS_KEY_ID,
        aws_secret_access_key=config.BUCKET_SECRET_ACCESS_KEY,
        region_name=config.BUCKET_REGION,
    )


def _put_object(key: str, content: bytes, content_type: str) -> None:
    client = _build_client()
    client.put_object(
        Bucket=config.BUCKET_NAME,
        Key=key,
        Body=content,
        ContentType=content_type,
    )


def _save_local_file(key: str, content: bytes) -> str:
    clean_key = key.lstrip("/\\")
    file_path = config.UPLOAD_DIR / clean_key
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(content)

    base = (config.SITE_URL or "").rstrip("/")
    if base:
        return f"{base}/uploads/{clean_key}"
    return f"/uploads/{clean_key}"


async def upload_file(key: str, content: bytes, content_type: str) -> str:
    if config.BUCKET_ENDPOINT_URL:
        await run_in_threadpool(_put_object, key, content, content_type)
        base = config.BUCKET_PUBLIC_URL_BASE.rstrip("/") if config.BUCKET_PUBLIC_URL_BASE else ""
        if not base and config.BUCKET_NAME:
            base = f"{config.BUCKET_ENDPOINT_URL.rstrip('/')}/{config.BUCKET_NAME}"
        return f"{base}/{key}"

    # Fallback gracioso: salva em disco local e serve via /uploads
    return await run_in_threadpool(_save_local_file, key, content)
