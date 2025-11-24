"""add current_status to recommendations

Revision ID: 004
Revises: 003
Create Date: 2025-11-22

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Add current_status_ar and current_status_en columns to recommendations table
    op.add_column('recommendations', sa.Column('current_status_ar', sa.Text(), nullable=True))
    op.add_column('recommendations', sa.Column('current_status_en', sa.Text(), nullable=True))


def downgrade():
    # Remove the columns if rolling back
    op.drop_column('recommendations', 'current_status_en')
    op.drop_column('recommendations', 'current_status_ar')
