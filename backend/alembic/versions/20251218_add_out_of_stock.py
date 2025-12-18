"""add_out_of_stock_to_product_status

Revision ID: 20251218_add_out_of_stock
Revises: 20251218_update_admin_enum
Create Date: 2025-12-18 17:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251218_add_out_of_stock'
down_revision = '20251218_update_admin_enum'
branch_labels = None
depends_on = None


def upgrade():
    # Add OUT_OF_STOCK to productstatus enum
    # PostgreSQL requires specific command to add value to enum
    op.execute("ALTER TYPE productstatus ADD VALUE IF NOT EXISTS 'OUT_OF_STOCK'")


def downgrade():
    # Removing enum value is not supported directly in Postgres without dropping type
    # We will skip removing the enum value for safety
    pass
