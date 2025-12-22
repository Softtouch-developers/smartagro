"""add_search_indexes

Revision ID: 7dce474d9335
Revises: 20251218_add_out_of_stock
Create Date: 2025-12-22 05:38:00.693384

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7dce474d9335'
down_revision: Union[str, Sequence[str], None] = '20251218_add_out_of_stock'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enable pg_trgm extension
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    
    # Add GIN indexes for text search
    op.create_index(
        'idx_product_name_trgm',
        'products',
        ['product_name'],
        postgresql_using='gin',
        postgresql_ops={'product_name': 'gin_trgm_ops'}
    )
    op.create_index(
        'idx_product_description_trgm',
        'products',
        ['description'],
        postgresql_using='gin',
        postgresql_ops={'description': 'gin_trgm_ops'}
    )
    op.create_index(
        'idx_product_variety_trgm',
        'products',
        ['variety'],
        postgresql_using='gin',
        postgresql_ops={'variety': 'gin_trgm_ops'}
    )
    
    # Index for category (enum cast to text)
    # To support ILIKE with wildcards on an Enum, we need a GIN index.
    # Direct cast is not immutable, so we wrap it in an immutable function.
    op.execute("""
        CREATE OR REPLACE FUNCTION product_category_to_text(p productcategory) 
        RETURNS text AS $$
            SELECT p::text;
        $$ LANGUAGE sql IMMUTABLE;
    """)
    
    op.execute("""
        CREATE INDEX idx_product_category_trgm 
        ON products 
        USING gin (product_category_to_text(category) gin_trgm_ops)
    """)

    # Add B-Tree indexes for filtering fields (combined with status for common queries)
    op.create_index(
        'idx_product_region_status',
        'products',
        ['region', 'status']
    )
    op.create_index(
        'idx_product_district_status',
        'products',
        ['district', 'status']
    )
    op.create_index(
        'idx_product_featured_status',
        'products',
        ['is_featured', 'status']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_product_featured_status', table_name='products')
    op.drop_index('idx_product_district_status', table_name='products')
    op.drop_index('idx_product_region_status', table_name='products')
    op.drop_index('idx_product_category_trgm', table_name='products')
    op.execute("DROP FUNCTION IF EXISTS product_category_to_text(productcategory)")
    op.drop_index('idx_product_variety_trgm', table_name='products')
    op.drop_index('idx_product_description_trgm', table_name='products')
    op.drop_index('idx_product_name_trgm', table_name='products')
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
