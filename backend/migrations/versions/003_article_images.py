"""add article_images table

Revision ID: 003
Revises: 002
Create Date: 2026-09-24
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "article_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "article_id",
            sa.Integer(),
            sa.ForeignKey("articles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("image_url", sa.String(500), nullable=False),
        sa.Column("photographer", sa.String(200), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_article_images_article_id", "article_images", ["article_id"])

    # Backfill: artigos que já têm featured_image_url ganham uma linha em
    # article_images com sort_order=0, preservando a imagem existente.
    op.execute(
        """
        INSERT INTO article_images (article_id, image_url, sort_order)
        SELECT id, featured_image_url, 0
        FROM articles
        WHERE featured_image_url IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_article_images_article_id", table_name="article_images")
    op.drop_table("article_images")
