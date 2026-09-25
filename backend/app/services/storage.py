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


async def upload_file(key: str, content: bytes, content_type: str) -> str:
    if not config.BUCKET_ENDPOINT_URL:
        raise StorageNotConfiguredError("BUCKET_ENDPOINT_URL não está configurada")

    await run_in_threadpool(_put_object, key, content, content_type)

    base = config.BUCKET_PUBLIC_URL_BASE.rstrip("/")
    return f"{base}/{key}"
