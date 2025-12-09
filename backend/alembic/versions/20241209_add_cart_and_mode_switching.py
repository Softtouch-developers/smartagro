"""Add cart system and mode switching

Revision ID: 20241209_cart_mode
Revises: 8f0d890501b0
Create Date: 2024-12-09

This migration adds:
1. User model: can_buy, current_mode fields; makes email nullable
2. Order model: order_number, carrier, delivery_confirmation_code fields
3. New tables: order_items, carts, cart_items
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20241209_cart_mode'
down_revision: Union[str, Sequence[str], None] = '8f0d890501b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    from sqlalchemy import inspect
    from alembic import op

    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    # Helper to check if column exists
    def column_exists(table, column):
        columns = [c['name'] for c in inspector.get_columns(table)]
        return column in columns

    # Helper to check if index exists
    def index_exists(table, index_name):
        indexes = [i['name'] for i in inspector.get_indexes(table)]
        return index_name in indexes

    # ==================== USER MODEL UPDATES ====================

    # Make email nullable (optional for farmers)
    op.alter_column('users', 'email',
                    existing_type=sa.String(length=255),
                    nullable=True)

    # Add can_buy and current_mode fields
    if not column_exists('users', 'can_buy'):
        op.add_column('users',
                      sa.Column('can_buy', sa.Boolean(), nullable=False, server_default='true'))
    if not column_exists('users', 'current_mode'):
        op.add_column('users',
                      sa.Column('current_mode', sa.String(length=10), nullable=True))

    # ==================== ORDER MODEL UPDATES ====================

    # Add order_number column (temporarily nullable for existing rows)
    if not column_exists('orders', 'order_number'):
        op.add_column('orders',
                      sa.Column('order_number', sa.String(length=50), nullable=True))

        # Generate order_number for existing orders
        op.execute("""
            UPDATE orders
            SET order_number = 'ORD-' || id || '-' || EXTRACT(EPOCH FROM created_at)::INTEGER
            WHERE order_number IS NULL
        """)

        # Now make order_number NOT NULL and add unique constraint
        op.alter_column('orders', 'order_number',
                        existing_type=sa.String(length=50),
                        nullable=False)

        if not index_exists('orders', 'ix_orders_order_number'):
            op.create_index('ix_orders_order_number', 'orders', ['order_number'], unique=True)

    # Add carrier and delivery_confirmation_code
    if not column_exists('orders', 'carrier'):
        op.add_column('orders',
                      sa.Column('carrier', sa.String(length=100), nullable=True))
    if not column_exists('orders', 'delivery_confirmation_code'):
        op.add_column('orders',
                      sa.Column('delivery_confirmation_code', sa.String(length=20), nullable=True))

    # ==================== ORDER ITEMS TABLE ====================

    if 'order_items' not in existing_tables:
        op.create_table('order_items',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=True),
        sa.Column('quantity', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('unit_price', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('subtotal', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('product_name_snapshot', sa.String(length=255), nullable=False),
        sa.Column('unit_of_measure_snapshot', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
        op.create_index('idx_order_item_order', 'order_items', ['order_id'], unique=False)
        op.create_index('idx_order_item_product', 'order_items', ['product_id'], unique=False)

    # ==================== CARTS TABLE ====================

    if 'carts' not in existing_tables:
        op.create_table('carts',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('buyer_id', sa.Integer(), nullable=False),
        sa.Column('farmer_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['buyer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['farmer_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
        op.create_index('idx_cart_buyer_status', 'carts', ['buyer_id', 'status'], unique=False)
        op.create_index('idx_cart_expires', 'carts', ['expires_at', 'status'], unique=False)
        op.create_index('ix_carts_buyer_id', 'carts', ['buyer_id'], unique=False)
        op.create_index('ix_carts_farmer_id', 'carts', ['farmer_id'], unique=False)
        op.create_index('ix_carts_status', 'carts', ['status'], unique=False)

    # ==================== CART ITEMS TABLE ====================

    if 'cart_items' not in existing_tables:
        op.create_table('cart_items',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('cart_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('unit_price_snapshot', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('added_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['cart_id'], ['carts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
        op.create_index('idx_cart_item_cart', 'cart_items', ['cart_id'], unique=False)
        op.create_index('idx_cart_item_product', 'cart_items', ['product_id'], unique=False)
        op.create_index('uq_cart_product', 'cart_items', ['cart_id', 'product_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""

    # Drop cart_items table
    op.drop_index('uq_cart_product', table_name='cart_items')
    op.drop_index('idx_cart_item_product', table_name='cart_items')
    op.drop_index('idx_cart_item_cart', table_name='cart_items')
    op.drop_table('cart_items')

    # Drop carts table
    op.drop_index('ix_carts_status', table_name='carts')
    op.drop_index('ix_carts_farmer_id', table_name='carts')
    op.drop_index('ix_carts_buyer_id', table_name='carts')
    op.drop_index('idx_cart_expires', table_name='carts')
    op.drop_index('idx_cart_buyer_status', table_name='carts')
    op.drop_table('carts')

    # Drop order_items table
    op.drop_index('idx_order_item_product', table_name='order_items')
    op.drop_index('idx_order_item_order', table_name='order_items')
    op.drop_table('order_items')

    # Revert order changes
    op.drop_index('ix_orders_order_number', table_name='orders')
    op.drop_column('orders', 'delivery_confirmation_code')
    op.drop_column('orders', 'carrier')
    op.drop_column('orders', 'order_number')

    # Revert user changes
    op.drop_column('users', 'current_mode')
    op.drop_column('users', 'can_buy')
    op.alter_column('users', 'email',
                    existing_type=sa.String(length=255),
                    nullable=False)
