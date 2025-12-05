"""
Support/Discussion schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# Attachment schemas
class SupportAttachmentBase(BaseModel):
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None


class SupportAttachmentCreate(SupportAttachmentBase):
    pass


class SupportAttachmentResponse(SupportAttachmentBase):
    id: str
    file_path: str
    thread_id: Optional[str] = None
    reply_id: Optional[str] = None
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


# Reply schemas
class SupportReplyBase(BaseModel):
    content: str = Field(..., min_length=1)


class SupportReplyCreate(SupportReplyBase):
    thread_id: str


class SupportReplyUpdate(BaseModel):
    content: Optional[str] = None


class SupportReplyResponse(SupportReplyBase):
    id: str
    thread_id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    creator_name: Optional[str] = None
    creator_name_en: Optional[str] = None
    attachments: List[SupportAttachmentResponse] = []

    class Config:
        from_attributes = True


# Thread schemas
class SupportThreadBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)


class SupportThreadCreate(SupportThreadBase):
    index_id: str


class SupportThreadUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_resolved: Optional[bool] = None


class SupportThreadResponse(SupportThreadBase):
    id: str
    index_id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    is_resolved: bool
    creator_name: Optional[str] = None
    creator_name_en: Optional[str] = None
    replies_count: int = 0
    attachments: List[SupportAttachmentResponse] = []

    class Config:
        from_attributes = True


class SupportThreadDetailResponse(SupportThreadResponse):
    replies: List[SupportReplyResponse] = []

    class Config:
        from_attributes = True


class SupportThreadListResponse(BaseModel):
    threads: List[SupportThreadResponse]
    total: int


class UnreadSupportCountResponse(BaseModel):
    count: int
