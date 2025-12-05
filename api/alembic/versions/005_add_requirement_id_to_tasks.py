"""add requirement_id to tasks

Revision ID: 005
Revises: 004
Create Date: 2025-12-04

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Add requirement_id column to tasks table
    op.add_column('tasks', sa.Column('requirement_id', sa.String(), nullable=True))
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_tasks_requirement_id',
        'tasks',
        'requirements',
        ['requirement_id'],
        ['id'],
        ondelete='SET NULL'
    )
    # Add index for better query performance
    op.create_index('ix_tasks_requirement_id', 'tasks', ['requirement_id'])


def downgrade():
    # Remove index first
    op.drop_index('ix_tasks_requirement_id', table_name='tasks')
    # Remove foreign key constraint
    op.drop_constraint('fk_tasks_requirement_id', 'tasks', type_='foreignkey')
    # Remove the column
    op.drop_column('tasks', 'requirement_id')
