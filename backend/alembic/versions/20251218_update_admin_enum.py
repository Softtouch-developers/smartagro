"""update_admin_enum_and_config

Revision ID: 20251218_update_admin_enum
Revises: 20251218_add_payment_cols
Create Date: 2025-12-18 16:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251218_update_admin_enum'
down_revision = '20251218_add_payment_cols'
branch_labels = None
depends_on = None


def upgrade():
    # Add SYSTEM_CONFIG_UPDATED to adminactiontype enum
    # PostgreSQL requires specific command to add value to enum
    op.execute("ALTER TYPE adminactiontype ADD VALUE IF NOT EXISTS 'SYSTEM_CONFIG_UPDATED'")
    
    # Insert AUTO_RELEASE_DAYS into system_configuration if not exists
    op.execute("""
        INSERT INTO system_configuration (key, value, description, updated_at)
        SELECT 'AUTO_RELEASE_DAYS', '3', 'Days until escrow auto-releases to seller', NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM system_configuration WHERE key = 'AUTO_RELEASE_DAYS'
        );
    """)


def downgrade():
    # Removing enum value is not supported directly in Postgres without dropping type
    # We will skip removing the enum value for safety
    
    # Remove AUTO_RELEASE_DAYS config
    op.execute("DELETE FROM system_configuration WHERE key = 'AUTO_RELEASE_DAYS'")
