"""add_pickup_confirmation_fields

Revision ID: 20251226_add_pickup_confirmation
Revises: 20251218_add_delivery_cols
Create Date: 2025-12-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251226_add_pickup_confirmation'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('orders')]

    if 'pickup_confirmed_by_farmer' not in columns:
        op.add_column('orders', sa.Column('pickup_confirmed_by_farmer', sa.Boolean(), server_default='false', nullable=False))

    if 'pickup_confirmed_by_buyer' not in columns:
        op.add_column('orders', sa.Column('pickup_confirmed_by_buyer', sa.Boolean(), server_default='false', nullable=False))

    if 'pickup_confirmed_at' not in columns:
        op.add_column('orders', sa.Column('pickup_confirmed_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('orders', 'pickup_confirmed_at')
    op.drop_column('orders', 'pickup_confirmed_by_buyer')
    op.drop_column('orders', 'pickup_confirmed_by_farmer')
