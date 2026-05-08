"""Initial schema: canvases, nodes, edges

Revision ID: 001
Revises:
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "canvases",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False, server_default="Untitled Canvas"),
        sa.Column("viewport_x", sa.Float(), nullable=False, server_default="0"),
        sa.Column("viewport_y", sa.Float(), nullable=False, server_default="0"),
        sa.Column("viewport_z", sa.Float(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "nodes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("canvas_id", sa.String(), sa.ForeignKey("canvases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("width", sa.Float(), nullable=False, server_default="200"),
        sa.Column("height", sa.Float(), nullable=False, server_default="120"),
        sa.Column("color", sa.String(50), nullable=False, server_default="default"),
        sa.Column("z_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("idx_nodes_canvas_id", "nodes", ["canvas_id"])

    op.create_table(
        "edges",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("canvas_id", sa.String(), sa.ForeignKey("canvases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_id", sa.String(), sa.ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_id", sa.String(), sa.ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.Text(), nullable=True),
        sa.Column("style", sa.String(50), nullable=False, server_default="solid"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.CheckConstraint("source_id != target_id", name="no_self_loop"),
    )
    op.create_index("idx_edges_canvas_id", "edges", ["canvas_id"])
    op.create_index("idx_edges_source", "edges", ["source_id"])
    op.create_index("idx_edges_target", "edges", ["target_id"])


def downgrade() -> None:
    op.drop_table("edges")
    op.drop_table("nodes")
    op.drop_table("canvases")
