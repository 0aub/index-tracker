"""
Role-based permission system
"""
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.index import Index
from app.models.index_user import IndexUser, IndexUserRole
from app.models.requirement import Requirement
from app.models.assignment import Assignment


class PermissionChecker:
    """Centralized permission checking logic"""

    def __init__(self, user: User, db: Session):
        self.user = user
        self.db = db
        self._user_indices_cache = None

    @property
    def is_admin(self) -> bool:
        """Check if user is an admin"""
        return self.user.role == UserRole.ADMIN

    @property
    def is_contributor(self) -> bool:
        """
        Check if user is a contributor in ANY index
        Note: This is deprecated - use get_index_role() to check per-index roles
        """
        # Check if user has CONTRIBUTOR role in any of their indices
        user_indices = self.get_user_indices()
        return any(idx.role == IndexUserRole.CONTRIBUTOR for idx in user_indices)

    def get_user_indices(self) -> List[IndexUser]:
        """Get all indices the user is assigned to"""
        if self._user_indices_cache is None:
            self._user_indices_cache = (
                self.db.query(IndexUser)
                .filter(IndexUser.user_id == self.user.id)
                .all()
            )
        return self._user_indices_cache

    def get_user_index_ids(self) -> List[str]:
        """Get list of index IDs the user is assigned to"""
        return [idx.index_id for idx in self.get_user_indices()]

    def has_index_access(self, index_id: str) -> bool:
        """Check if user has access to a specific index"""
        # Admins have access to everything
        if self.is_admin:
            return True

        # Check if user is assigned to this index
        return index_id in self.get_user_index_ids()

    def get_index_role(self, index_id: str) -> Optional[IndexUserRole]:
        """Get user's role within a specific index"""
        index_user = (
            self.db.query(IndexUser)
            .filter(
                IndexUser.user_id == self.user.id,
                IndexUser.index_id == index_id
            )
            .first()
        )
        return index_user.role if index_user else None

    def can_view_index(self, index_id: str) -> bool:
        """Check if user can view a specific index"""
        return self.has_index_access(index_id)

    def can_edit_index_metadata(self, index_id: str) -> bool:
        """
        Check if user can edit index metadata (name, description, dates, etc.)
        Only ADMIN and users with OWNER role can edit
        SUPERVISOR cannot edit index metadata
        """
        if self.is_admin:
            return True

        if not self.has_index_access(index_id):
            return False

        # Users with OWNER role can edit
        index_role = self.get_index_role(index_id)
        return index_role == IndexUserRole.OWNER

    def can_create_index(self, index_type: Optional[str] = None) -> bool:
        """
        Check if user can create a new index
        ADMIN: Can create any type
        Users with OWNER role in any index: Can create indices of same type
        SUPERVISOR and CONTRIBUTOR: Cannot create indices
        """
        if self.is_admin:
            return True

        # Check if user has OWNER role in any index
        user_indices = self.get_user_indices()
        has_owner_role = any(idx.role == IndexUserRole.OWNER for idx in user_indices)

        if not has_owner_role:
            return False

        # If no specific type provided, they can create
        if index_type is None:
            return True

        # Check if user has at least one index of this type
        for idx_user in user_indices:
            if idx_user.role == IndexUserRole.OWNER:
                index = self.db.query(Index).filter(Index.id == idx_user.index_id).first()
                if index and index.index_type == index_type:
                    return True

        # If user has no indices yet, allow creation
        if len(user_indices) == 0:
            return True

        return False

    def can_view_requirements(self, index_id: str) -> bool:
        """Check if user can view requirements for an index"""
        return self.has_index_access(index_id)

    def can_edit_requirement(self, requirement_id: str) -> bool:
        """
        Check if user can edit a requirement
        ADMIN: Can edit any requirement
        OWNER: Can edit requirements in their indices
        SUPERVISOR: Can edit requirements in their indices
        CONTRIBUTOR: Cannot edit requirements
        """
        if self.is_admin:
            return True

        # Get the requirement to check its index
        requirement = self.db.query(Requirement).filter(Requirement.id == requirement_id).first()
        if not requirement:
            return False

        if not self.has_index_access(requirement.index_id):
            return False

        # Check per-index role
        index_role = self.get_index_role(requirement.index_id)
        return index_role in [IndexUserRole.OWNER, IndexUserRole.SUPERVISOR]

    def can_manage_requirements(self, index_id: str) -> bool:
        """
        Check if user can create/edit/delete/reorder requirements for an index
        ADMIN: Can manage all requirements
        OWNER: Can manage requirements in their indices
        SUPERVISOR: Can manage requirements in their indices
        CONTRIBUTOR: Cannot manage requirements
        """
        if self.is_admin:
            return True

        if not self.has_index_access(index_id):
            return False

        # Check per-index role
        index_role = self.get_index_role(index_id)
        return index_role in [IndexUserRole.OWNER, IndexUserRole.SUPERVISOR]

    def can_submit_evidence(self, requirement_id: str) -> bool:
        """
        Check if user can submit evidence for a requirement
        For CONTRIBUTORS: Only if assigned to that requirement
        For SUPERVISOR and OWNER: Can submit for any requirement in their index
        ADMIN: Can submit anywhere
        """
        if self.is_admin:
            return True

        # Get the requirement to check its index
        requirement = self.db.query(Requirement).filter(Requirement.id == requirement_id).first()
        if not requirement:
            return False

        if not self.has_index_access(requirement.index_id):
            return False

        index_role = self.get_index_role(requirement.index_id)

        # OWNER and SUPERVISOR can submit evidence for any requirement
        if index_role in [IndexUserRole.OWNER, IndexUserRole.SUPERVISOR]:
            return True

        # CONTRIBUTOR can only submit evidence if assigned to this requirement
        if index_role == IndexUserRole.CONTRIBUTOR:
            assignment = (
                self.db.query(Assignment)
                .filter(
                    Assignment.requirement_id == requirement_id,
                    Assignment.user_id == self.user.id
                )
                .first()
            )
            return assignment is not None

        return False

    def can_view_users(self) -> bool:
        """
        Check if user can view system users
        Only ADMIN can view users
        """
        return self.is_admin

    def can_manage_users(self) -> bool:
        """
        Check if user can create/edit/delete users
        Only ADMIN can manage users
        """
        return self.is_admin

    def get_accessible_requirement_ids(self, index_id: str) -> List[str]:
        """
        Get list of requirement IDs the user can access within an index
        ADMIN, OWNER, SUPERVISOR: All requirements
        CONTRIBUTOR: Only assigned requirements
        """
        if self.is_admin:
            # Admin sees all requirements
            requirements = (
                self.db.query(Requirement.id)
                .filter(Requirement.index_id == index_id)
                .all()
            )
            return [r.id for r in requirements]

        if not self.has_index_access(index_id):
            return []

        index_role = self.get_index_role(index_id)

        # OWNER and SUPERVISOR see all requirements
        if index_role in [IndexUserRole.OWNER, IndexUserRole.SUPERVISOR]:
            requirements = (
                self.db.query(Requirement.id)
                .filter(Requirement.index_id == index_id)
                .all()
            )
            return [r.id for r in requirements]

        # CONTRIBUTOR only sees assigned requirements
        if index_role == IndexUserRole.CONTRIBUTOR:
            assignments = (
                self.db.query(Assignment.requirement_id)
                .filter(Assignment.user_id == self.user.id)
                .join(Requirement)
                .filter(Requirement.index_id == index_id)
                .all()
            )
            return [a.requirement_id for a in assignments]

        return []

    def require_admin(self):
        """Raise exception if user is not admin"""
        if not self.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="فقط المسؤول يمكنه الوصول إلى هذا المورد" if True else "Only administrators can access this resource"
            )

    def require_index_access(self, index_id: str):
        """Raise exception if user doesn't have access to index"""
        if not self.has_index_access(index_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ليس لديك صلاحية للوصول إلى هذا المؤشر" if True else "You don't have access to this index"
            )

    def require_index_edit_access(self, index_id: str):
        """Raise exception if user cannot edit index"""
        if not self.can_edit_index_metadata(index_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ليس لديك صلاحية لتعديل هذا المؤشر" if True else "You don't have permission to edit this index"
            )

    def require_requirement_edit_access(self, requirement_id: str):
        """Raise exception if user cannot edit requirement"""
        if not self.can_edit_requirement(requirement_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ليس لديك صلاحية لتعديل هذا المتطلب" if True else "You don't have permission to edit this requirement"
            )


def get_permission_checker(user: User, db: Session) -> PermissionChecker:
    """Factory function to create a PermissionChecker instance"""
    return PermissionChecker(user, db)
