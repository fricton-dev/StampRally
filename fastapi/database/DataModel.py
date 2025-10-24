from pydantic import BaseModel
from typing import Optional, Union
from datetime import datetime

class ApiResponse(BaseModel):
    statusCode: int
    body: dict

# ユーザーモデル
class Users(BaseModel):
    id: Optional[int] = None
    tenant_id: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    password_hash: Optional[str] = None
    role: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    is_active: Optional[bool] = True
    created_at: Optional[Union[datetime, str]] = None
    updated_at: Optional[Union[datetime, str]] = None

    @staticmethod
    def get_table_name():
        return "users"

# セッションモデル
class Sessions(BaseModel):
    id: Optional[int] = None
    user_id: Optional[int] = None
    token: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    @staticmethod
    def get_table_name():
        return "sessions"
