"""add_delivery_and_tracking_to_orders

Revision ID: 20251218_add_delivery_cols
Revises: 20241209_add_cart_and_mode_switching
Create Date: 2025-12-18 16:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251218_add_delivery_cols'
down_revision = '20241209_cart_mode'
branch_labels = None
depends_on = None


def upgrade():
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('orders')]

    if 'delivery_method' not in columns:
        op.add_column('orders', sa.Column('delivery_method', sa.String(length=20), server_default='DELIVERY', nullable=False))
    
    if 'delivery_address' not in columns:
        op.add_column('orders', sa.Column('delivery_address', sa.Text(), nullable=True))
    
    if 'delivery_region' not in columns:
        op.add_column('orders', sa.Column('delivery_region', sa.String(length=50), nullable=True))
    
    if 'delivery_district' not in columns:
        op.add_column('orders', sa.Column('delivery_district', sa.String(length=100), nullable=True))
    
    if 'delivery_gps' not in columns:
        op.add_column('orders', sa.Column('delivery_gps', sa.String(length=50), nullable=True))
    
    if 'delivery_phone' not in columns:
        op.add_column('orders', sa.Column('delivery_phone', sa.String(length=20), nullable=True))
    
    if 'delivery_notes' not in columns:
        op.add_column('orders', sa.Column('delivery_notes', sa.Text(), nullable=True))
    
    if 'expected_delivery_date' not in columns:
        op.add_column('orders', sa.Column('expected_delivery_date', sa.Date(), nullable=True))
    
    if 'actual_delivery_date' not in columns:
        op.add_column('orders', sa.Column('actual_delivery_date', sa.Date(), nullable=True))
    
    if 'shipped_at' not in columns:
        op.add_column('orders', sa.Column('shipped_at', sa.DateTime(), nullable=True))
    
    if 'delivered_at' not in columns:
        op.add_column('orders', sa.Column('delivered_at', sa.DateTime(), nullable=True))
    
    if 'tracking_number' not in columns:
        op.add_column('orders', sa.Column('tracking_number', sa.String(length=100), nullable=True))
    
    if 'carrier' not in columns:
        op.add_column('orders', sa.Column('carrier', sa.String(length=100), nullable=True))
    
    if 'delivery_confirmation_code' not in columns:
        op.add_column('orders', sa.Column('delivery_confirmation_code', sa.String(length=20), nullable=True))
    
    if 'tracking_notes' not in columns:
        op.add_column('orders', sa.Column('tracking_notes', sa.Text(), nullable=True))
    
    if 'buyer_notes' not in columns:
        op.add_column('orders', sa.Column('buyer_notes', sa.Text(), nullable=True))
    
    if 'seller_notes' not in columns:
        op.add_column('orders', sa.Column('seller_notes', sa.Text(), nullable=True))

    # If there are existing rows, we might want to update delivery_address to not be null if we want to enforce it later.
    # op.execute("UPDATE orders SET delivery_address = 'Unknown' WHERE delivery_address IS NULL")
    # op.alter_column('orders', 'delivery_address', nullable=False)


def downgrade():
    op.drop_column('orders', 'seller_notes')
    op.drop_column('orders', 'buyer_notes')
    op.drop_column('orders', 'tracking_notes')
    op.drop_column('orders', 'delivery_confirmation_code')
    op.drop_column('orders', 'carrier')
    op.drop_column('orders', 'tracking_number')
    op.drop_column('orders', 'delivered_at')
    op.drop_column('orders', 'shipped_at')
    op.drop_column('orders', 'actual_delivery_date')
    op.drop_column('orders', 'expected_delivery_date')
    op.drop_column('orders', 'delivery_notes')
    op.drop_column('orders', 'delivery_phone')
    op.drop_column('orders', 'delivery_gps')
    op.drop_column('orders', 'delivery_district')
    op.drop_column('orders', 'delivery_region')
    op.drop_column('orders', 'delivery_address')
    op.drop_column('orders', 'delivery_method')
