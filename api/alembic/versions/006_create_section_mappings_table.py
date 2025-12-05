"""create section_mappings table

Revision ID: 006
Revises: 005
Create Date: 2025-12-04

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Create section_mappings table
    op.create_table(
        'section_mappings',
        sa.Column('id', sa.String(), primary_key=True, index=True),
        sa.Column('current_index_id', sa.String(), sa.ForeignKey('indices.id'), nullable=False, index=True),
        sa.Column('previous_index_id', sa.String(), sa.ForeignKey('indices.id'), nullable=False, index=True),
        # Main area mapping
        sa.Column('main_area_from_ar', sa.String(), nullable=False),
        sa.Column('main_area_to_ar', sa.String(), nullable=False),
        sa.Column('main_area_from_en', sa.String(), nullable=True),
        sa.Column('main_area_to_en', sa.String(), nullable=True),
        # Element mapping (optional)
        sa.Column('element_from_ar', sa.String(), nullable=True),
        sa.Column('element_to_ar', sa.String(), nullable=True),
        sa.Column('element_from_en', sa.String(), nullable=True),
        sa.Column('element_to_en', sa.String(), nullable=True),
        # Sub-domain mapping (optional)
        sa.Column('sub_domain_from_ar', sa.String(), nullable=True),
        sa.Column('sub_domain_to_ar', sa.String(), nullable=True),
        sa.Column('sub_domain_from_en', sa.String(), nullable=True),
        sa.Column('sub_domain_to_en', sa.String(), nullable=True),
        # Audit fields
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sa.String(), sa.ForeignKey('users.id'), nullable=False),
    )


def downgrade():
    op.drop_table('section_mappings')
