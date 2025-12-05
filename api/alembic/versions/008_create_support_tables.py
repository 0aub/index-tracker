"""Create support tables

Revision ID: 008_create_support_tables
Revises: 007_create_knowledge_items_table
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008_create_support_tables'
down_revision = '007_create_knowledge_items_table'
branch_labels = None
depends_on = None


def upgrade():
    # Create support_threads table
    op.create_table(
        'support_threads',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('index_id', sa.String(), nullable=False),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('is_resolved', sa.Boolean(), nullable=False, server_default='false'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['index_id'], ['indices.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
    op.create_index('ix_support_threads_id', 'support_threads', ['id'])
    op.create_index('ix_support_threads_index_id', 'support_threads', ['index_id'])
    op.create_index('ix_support_threads_created_by', 'support_threads', ['created_by'])

    # Create support_replies table
    op.create_table(
        'support_replies',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('thread_id', sa.String(), nullable=False),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['thread_id'], ['support_threads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
    op.create_index('ix_support_replies_id', 'support_replies', ['id'])
    op.create_index('ix_support_replies_thread_id', 'support_replies', ['thread_id'])
    op.create_index('ix_support_replies_created_by', 'support_replies', ['created_by'])

    # Create support_attachments table
    op.create_table(
        'support_attachments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('file_type', sa.String(100), nullable=True),
        sa.Column('thread_id', sa.String(), nullable=True),
        sa.Column('reply_id', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['thread_id'], ['support_threads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reply_id'], ['support_replies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
    op.create_index('ix_support_attachments_id', 'support_attachments', ['id'])
    op.create_index('ix_support_attachments_thread_id', 'support_attachments', ['thread_id'])
    op.create_index('ix_support_attachments_reply_id', 'support_attachments', ['reply_id'])


def downgrade():
    op.drop_table('support_attachments')
    op.drop_table('support_replies')
    op.drop_table('support_threads')
