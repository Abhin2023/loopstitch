from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from . import models


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Product Images / Sizes ----------
class ProductImageOut(BaseModel):
    id: int
    url: str
    position: int

    class Config:
        from_attributes = True


class ProductSizeIn(BaseModel):
    size: str
    stock: int = Field(default=0, ge=0)


class ProductSizeOut(ProductSizeIn):
    id: int

    class Config:
        from_attributes = True


# ---------- Products ----------
class ProductBase(BaseModel):
    name: str
    description: str = ""
    price: float = Field(gt=0)
    compare_at_price: Optional[float] = Field(default=None, gt=0)
    category: str = "tshirt"
    colorway: str = ""
    is_active: bool = True
    is_featured: bool = False


class ProductCreate(ProductBase):
    sizes: List[ProductSizeIn] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    compare_at_price: Optional[float] = Field(default=None, gt=0)
    category: Optional[str] = None
    colorway: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    sizes: Optional[List[ProductSizeIn]] = None


class ProductOut(ProductBase):
    id: int
    slug: str
    created_at: datetime
    images: List[ProductImageOut] = []
    sizes: List[ProductSizeOut] = []
    total_stock: int

    class Config:
        from_attributes = True


# ---------- Orders ----------
class OrderItemIn(BaseModel):
    product_id: int
    size: str
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    shipping_address: str
    city: str = ""
    state: str = ""
    pincode: str = ""
    items: List[OrderItemIn]


class OrderItemOut(BaseModel):
    id: int
    product_name: str
    size: str
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    order_number: str
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: str
    city: str
    state: str
    pincode: str
    status: str
    subtotal: float
    shipping_fee: float
    total: float
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: models.OrderStatus
