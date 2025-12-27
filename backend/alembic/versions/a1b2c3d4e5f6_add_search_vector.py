"""add_search_vector

Revision ID: a1b2c3d4e5f6
Revises: 7dce474d9335
Create Date: 2025-12-22 22:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TSVECTOR

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '7dce474d9335'
branch_labels = None
depends_on = None

def upgrade():
    # Add column
    op.add_column('products', sa.Column('search_vector', TSVECTOR(), nullable=True))
    
    # Create index
    op.create_index('idx_product_search_vector', 'products', ['search_vector'], postgresql_using='gin')
    
    # Backfill data
    # Using product_category_to_text function from previous migration
    op.execute("""
        UPDATE products
        SET search_vector = to_tsvector('english', 
            coalesce(product_name, '') || ' ' || 
            coalesce(description, '') || ' ' || 
            coalesce(variety, '') || ' ' || 
            product_category_to_text(category)
        )
    """)

def downgrade():
    op.drop_index('idx_product_search_vector', table_name='products')
    op.drop_column('products', 'search_vector')
