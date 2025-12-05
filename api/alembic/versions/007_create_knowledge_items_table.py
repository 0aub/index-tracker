"""Create knowledge_items table

Revision ID: 007
Revises: 006
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create knowledge_items table
    op.create_table(
        'knowledge_items',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('content_type', sa.Enum('youtube', 'pdf', 'pptx', name='knowledgeitemtype'), nullable=False),
        sa.Column('content_url', sa.String(), nullable=False),
        sa.Column('thumbnail_path', sa.String(), nullable=True),
        sa.Column('file_name', sa.String(), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('index_id', sa.String(), nullable=False),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['index_id'], ['indices.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_items_id'), 'knowledge_items', ['id'], unique=False)
    op.create_index(op.f('ix_knowledge_items_index_id'), 'knowledge_items', ['index_id'], unique=False)
    op.create_index(op.f('ix_knowledge_items_created_by'), 'knowledge_items', ['created_by'], unique=False)
    op.create_index(op.f('ix_knowledge_items_content_type'), 'knowledge_items', ['content_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_knowledge_items_content_type'), table_name='knowledge_items')
    op.drop_index(op.f('ix_knowledge_items_created_by'), table_name='knowledge_items')
    op.drop_index(op.f('ix_knowledge_items_index_id'), table_name='knowledge_items')
    op.drop_index(op.f('ix_knowledge_items_id'), table_name='knowledge_items')
    op.drop_table('knowledge_items')
    # Drop enum type
    op.execute('DROP TYPE IF EXISTS knowledgeitemtype')
