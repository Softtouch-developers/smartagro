"""add_payment_and_cancellation_cols

Revision ID: 20251218_add_payment_cols
Revises: 20251218_add_delivery_cols
Create Date: 2025-12-18 16:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251218_add_payment_cols'
down_revision = '20251218_add_delivery_cols'
branch_labels = None
depends_on = None


def upgrade():
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('orders')]

    # Payment Status (Enum)
    if 'payment_status' not in columns:
        # We might need to create the enum type if it doesn't exist, but usually SQLAlchemy handles it or we use String.
        # Given the error was UndefinedColumn, the column is missing.
        op.add_column('orders', sa.Column('payment_status', sa.String(length=20), server_default='PENDING', nullable=False))

    if 'payment_reference' not in columns:
        op.add_column('orders', sa.Column('payment_reference', sa.String(length=255), nullable=True))
        op.create_unique_constraint('uq_orders_payment_reference', 'orders', ['payment_reference'])

    if 'payment_method' not in columns:
        op.add_column('orders', sa.Column('payment_method', sa.String(length=50), server_default='PAYSTACK', nullable=False))

    # Cancellation
    if 'cancelled_reason' not in columns:
        op.add_column('orders', sa.Column('cancelled_reason', sa.Text(), nullable=True))

    if 'cancelled_by_user_id' not in columns:
        op.add_column('orders', sa.Column('cancelled_by_user_id', sa.Integer(), nullable=True))
        op.create_foreign_key('fk_orders_cancelled_by', 'orders', 'users', ['cancelled_by_user_id'], ['id'])

    if 'cancelled_at' not in columns:
        op.add_column('orders', sa.Column('cancelled_at', sa.DateTime(), nullable=True))

    # Completion
    if 'completed_at' not in columns:
        op.add_column('orders', sa.Column('completed_at', sa.DateTime(), nullable=True))

    # Fees
    if 'platform_fee' not in columns:
        op.add_column('orders', sa.Column('platform_fee', sa.DECIMAL(precision=10, scale=2), server_default='0.00', nullable=False))

    if 'delivery_fee' not in columns:
        op.add_column('orders', sa.Column('delivery_fee', sa.DECIMAL(precision=10, scale=2), server_default='0.00', nullable=False))


def downgrade():
    op.drop_column('orders', 'delivery_fee')
    op.drop_column('orders', 'platform_fee')
    op.drop_column('orders', 'completed_at')
    op.drop_column('orders', 'cancelled_at')
    op.drop_constraint('fk_orders_cancelled_by', 'orders', type_='foreignkey')
    op.drop_column('orders', 'cancelled_by_user_id')
    op.drop_column('orders', 'cancelled_reason')
    op.drop_column('orders', 'payment_method')
    op.drop_constraint('uq_orders_payment_reference', 'orders', type_='unique')
    op.drop_column('orders', 'payment_reference')
    op.drop_column('orders', 'payment_status')
