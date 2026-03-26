from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


class ParentLoginRequest(BaseModel):
    matricule: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=255)


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=255)


class ChangePasswordIn(BaseModel):
    old_password: str = Field(min_length=1, max_length=255)
    new_password: str = Field(min_length=8, max_length=255)


class FirstLoginChangePasswordIn(BaseModel):
    new_password: str = Field(min_length=8, max_length=255)

