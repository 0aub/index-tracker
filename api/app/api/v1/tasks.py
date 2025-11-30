"""
Tasks router - create and manage tasks with assignments and comments
"""
import uuid
import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.models import Task, TaskAssignment, TaskComment, TaskAttachment, TaskStatus, User, UserRole, IndexUser
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskListResponse,
    TaskCommentCreate,
    TaskCommentResponse,
    TaskAssignmentResponse
)
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


def can_view_task(task: Task, user: User, db: Session) -> bool:
    """Check if user can view a task"""
    # Admins can see all tasks
    if user.role == UserRole.ADMIN:
        return True

    # Index owners (INDEX_MANAGER role with ownership via IndexUser) can see tasks for their indices
    if user.role == UserRole.INDEX_MANAGER:
        # Check if user owns this task's index
        index_ownership = db.query(IndexUser).filter(
            and_(
                IndexUser.user_id == user.id,
                IndexUser.index_id == task.index_id
            )
        ).first()
        if index_ownership:
            return True

    # Task creator can see their tasks
    if task.created_by == user.id:
        return True

    # Check if user is assigned to the task
    assignment = db.query(TaskAssignment).filter(
        and_(
            TaskAssignment.task_id == task.id,
            TaskAssignment.user_id == user.id
        )
    ).first()

    return assignment is not None


def can_modify_task(task: Task, user: User, db: Session) -> bool:
    """Check if user can modify a task"""
    # Admins can modify all tasks
    if user.role == UserRole.ADMIN:
        return True

    # Index owners (INDEX_MANAGER role with ownership via IndexUser) can modify tasks for their indices
    if user.role == UserRole.INDEX_MANAGER:
        # Check if user owns this task's index
        index_ownership = db.query(IndexUser).filter(
            and_(
                IndexUser.user_id == user.id,
                IndexUser.index_id == task.index_id
            )
        ).first()
        if index_ownership:
            return True

    # Task creator can modify their tasks
    if task.created_by == user.id:
        return True

    return False


def enrich_task_response(task: Task, db: Session) -> dict:
    """Enrich task with creator and assignee information"""
    task_dict = {
        "id": task.id,
        "title": task.title,
        "title_en": task.title_en,
        "description": task.description,
        "description_en": task.description_en,
        "status": task.status.value,
        "priority": task.priority.value,
        "index_id": task.index_id,
        "due_date": task.due_date,
        "created_by": task.created_by,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "completed_at": task.completed_at,
        "comment_count": len(task.comments),
        "assignments": [],
        "comments": []
    }

    # Add creator info
    creator = db.query(User).filter(User.id == task.created_by).first()
    if creator:
        task_dict["creator_name"] = creator.name
        task_dict["creator_name_en"] = creator.name_en

    # Add index info
    if task.index:
        task_dict["index_name"] = task.index.name
        task_dict["index_name_en"] = task.index.name_en

    # Add assignments with user info
    for assignment in task.assignments:
        user = db.query(User).filter(User.id == assignment.user_id).first()
        task_dict["assignments"].append({
            "id": assignment.id,
            "task_id": assignment.task_id,
            "user_id": assignment.user_id,
            "assigned_by": assignment.assigned_by,
            "assigned_at": assignment.assigned_at,
            "user_name": user.name if user else None,
            "user_name_en": user.name_en if user else None
        })

    # Add comments with user info and attachments
    for comment in task.comments:
        user = db.query(User).filter(User.id == comment.user_id).first()
        comment_dict = {
            "id": comment.id,
            "task_id": comment.task_id,
            "user_id": comment.user_id,
            "comment": comment.comment,
            "comment_en": comment.comment_en,
            "created_at": comment.created_at,
            "updated_at": comment.updated_at,
            "user_name": user.name if user else None,
            "user_name_en": user.name_en if user else None,
            "attachments": []
        }

        # Add attachments
        for attachment in comment.attachments:
            comment_dict["attachments"].append({
                "id": attachment.id,
                "comment_id": attachment.comment_id,
                "file_name": attachment.file_name,
                "file_path": attachment.file_path,
                "file_size": attachment.file_size,
                "file_type": attachment.file_type,
                "uploaded_at": attachment.uploaded_at
            })

        task_dict["comments"].append(comment_dict)

    return task_dict


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    status: Optional[str] = None,
    index_id: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_me: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List tasks with optional filters

    - Admins: see all tasks
    - Index Owners (INDEX_MANAGER with index ownership): see tasks for their indices + tasks assigned to them
    - Contributors/Supervisors: see only tasks assigned to them or created by them
    """
    # Build base query
    query = db.query(Task)

    # Apply permission filter
    if current_user.role == UserRole.ADMIN:
        # Admins see all tasks - no filter needed
        pass
    elif current_user.role == UserRole.INDEX_MANAGER:
        # Index owners see tasks for their owned indices + tasks assigned to them
        # Get indices owned by this user
        owned_index_ids = db.query(IndexUser.index_id).filter(
            IndexUser.user_id == current_user.id
        ).subquery()

        # Get tasks assigned to this user
        assigned_task_ids = db.query(TaskAssignment.task_id).filter(
            TaskAssignment.user_id == current_user.id
        ).subquery()

        query = query.filter(
            or_(
                Task.index_id.in_(owned_index_ids),
                Task.id.in_(assigned_task_ids),
                Task.created_by == current_user.id
            )
        )
    else:
        # Contributors/Supervisors can only see tasks they created or are assigned to
        assigned_task_ids = db.query(TaskAssignment.task_id).filter(
            TaskAssignment.user_id == current_user.id
        ).subquery()

        query = query.filter(
            or_(
                Task.created_by == current_user.id,
                Task.id.in_(assigned_task_ids)
            )
        )

    # Apply filters
    if status:
        query = query.filter(Task.status == status)

    if index_id:
        query = query.filter(Task.index_id == index_id)

    if priority:
        query = query.filter(Task.priority == priority)

    if assigned_to_me:
        assigned_task_ids = db.query(TaskAssignment.task_id).filter(
            TaskAssignment.user_id == current_user.id
        ).subquery()
        query = query.filter(Task.id.in_(assigned_task_ids))

    # Get all tasks
    tasks = query.order_by(Task.created_at.desc()).all()

    # Enrich tasks with user info
    enriched_tasks = [enrich_task_response(task, db) for task in tasks]

    # Count by status (using the same permission filter)
    all_tasks = db.query(Task)
    if current_user.role == UserRole.ADMIN:
        # Admins see all tasks - no filter needed
        pass
    elif current_user.role == UserRole.INDEX_MANAGER:
        # Index owners see tasks for their owned indices + tasks assigned to them
        owned_index_ids = db.query(IndexUser.index_id).filter(
            IndexUser.user_id == current_user.id
        ).subquery()

        assigned_task_ids = db.query(TaskAssignment.task_id).filter(
            TaskAssignment.user_id == current_user.id
        ).subquery()

        all_tasks = all_tasks.filter(
            or_(
                Task.index_id.in_(owned_index_ids),
                Task.id.in_(assigned_task_ids),
                Task.created_by == current_user.id
            )
        )
    else:
        # Contributors/Supervisors
        assigned_task_ids = db.query(TaskAssignment.task_id).filter(
            TaskAssignment.user_id == current_user.id
        ).subquery()
        all_tasks = all_tasks.filter(
            or_(
                Task.created_by == current_user.id,
                Task.id.in_(assigned_task_ids)
            )
        )

    todo_count = all_tasks.filter(Task.status == TaskStatus.TODO).count()
    in_progress_count = all_tasks.filter(Task.status == TaskStatus.IN_PROGRESS).count()
    completed_count = all_tasks.filter(Task.status == TaskStatus.COMPLETED).count()

    return TaskListResponse(
        tasks=enriched_tasks,
        total=len(enriched_tasks),
        todo_count=todo_count,
        in_progress_count=in_progress_count,
        completed_count=completed_count
    )


@router.post("", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new task"""
    # Create task
    task = Task(
        id=f"task_{uuid.uuid4().hex[:12]}",
        title=task_data.title,
        title_en=task_data.title_en,
        description=task_data.description,
        description_en=task_data.description_en,
        status=TaskStatus.TODO,
        priority=task_data.priority,
        index_id=task_data.index_id,
        due_date=task_data.due_date,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(task)

    # Create assignments
    for user_id in task_data.assignee_ids:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {user_id} not found"
            )

        assignment = TaskAssignment(
            id=f"ta_{uuid.uuid4().hex[:12]}",
            task_id=task.id,
            user_id=user_id,
            assigned_by=current_user.id,
            assigned_at=datetime.utcnow()
        )
        db.add(assignment)

    try:
        db.commit()
        db.refresh(task)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )

    # Return enriched task
    return enrich_task_response(task, db)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a task by ID"""
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Check permissions
    if not can_view_task(task, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this task"
        )

    return enrich_task_response(task, db)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a task"""
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Check permissions
    if not can_modify_task(task, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this task"
        )

    # Update fields
    update_dict = task_data.model_dump(exclude_unset=True)

    for field, value in update_dict.items():
        if field == "status":
            # Convert string to enum
            if value == "completed" and task.status != TaskStatus.COMPLETED:
                task.completed_at = datetime.utcnow()
            setattr(task, field, TaskStatus(value))
        else:
            setattr(task, field, value)

    task.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(task)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update task: {str(e)}"
        )

    return enrich_task_response(task, db)


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a task"""
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Check permissions - only admins and task creator can delete
    if not can_modify_task(task, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this task"
        )

    db.delete(task)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete task: {str(e)}"
        )

    return {"message": "Task deleted successfully"}


@router.post("/{task_id}/comments", response_model=TaskCommentResponse)
async def add_comment(
    task_id: str,
    comment_data: TaskCommentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a task"""
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Check if user can view/comment on the task
    if not can_view_task(task, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to comment on this task"
        )

    # Create comment
    comment = TaskComment(
        id=f"tc_{uuid.uuid4().hex[:12]}",
        task_id=task_id,
        user_id=current_user.id,
        comment=comment_data.comment,
        comment_en=comment_data.comment_en,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(comment)

    try:
        db.commit()
        db.refresh(comment)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add comment: {str(e)}"
        )

    # Return enriched comment
    return {
        "id": comment.id,
        "task_id": comment.task_id,
        "user_id": comment.user_id,
        "comment": comment.comment,
        "comment_en": comment.comment_en,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
        "user_name": current_user.name,
        "user_name_en": current_user.name_en,
        "attachments": []
    }


@router.post("/{task_id}/comments/{comment_id}/attachments")
async def upload_attachment(
    task_id: str,
    comment_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload an attachment to a comment"""
    # Verify task exists
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Verify comment exists
    comment = db.query(TaskComment).filter(
        and_(
            TaskComment.id == comment_id,
            TaskComment.task_id == task_id
        )
    ).first()

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    # Check permissions
    if not can_view_task(task, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload attachments to this task"
        )

    # Create upload directory
    upload_dir = f"/app/uploads/task_attachments/{task_id}/{comment_id}"
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    file_id = uuid.uuid4().hex[:12]
    file_name = file.filename
    file_path = os.path.join(upload_dir, f"{file_id}{file_ext}")

    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    # Create attachment record
    attachment = TaskAttachment(
        id=f"tat_{uuid.uuid4().hex[:12]}",
        comment_id=comment_id,
        file_name=file_name,
        file_path=file_path,
        file_size=len(contents),
        file_type=file.content_type or "application/octet-stream",
        uploaded_at=datetime.utcnow()
    )

    db.add(attachment)

    try:
        db.commit()
        db.refresh(attachment)
    except Exception as e:
        db.rollback()
        # Clean up file if database operation fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save attachment: {str(e)}"
        )

    return {
        "id": attachment.id,
        "comment_id": attachment.comment_id,
        "file_name": attachment.file_name,
        "file_path": attachment.file_path,
        "file_size": attachment.file_size,
        "file_type": attachment.file_type,
        "uploaded_at": attachment.uploaded_at
    }
