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
    line_discount: float = 0

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
    discount_amount: float = 0
    offer_label: str = ""
    coupon_code: str = ""
    coupon_discount: float = 0
    shipping_fee: float
    total: float
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: models.OrderStatus


# ---------- Coupons ----------
class CouponBase(BaseModel):
    code: str
    discount_percent: float = Field(ge=1, le=100)
    max_uses: int = Field(default=0, ge=0)
    min_order: float = Field(default=0.0, ge=0)
    is_active: bool = True
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    code: Optional[str] = None
    discount_percent: Optional[float] = Field(default=None, ge=1, le=100)
    max_uses: Optional[int] = Field(default=None, ge=0)
    min_order: Optional[float] = Field(default=None, ge=0)
    is_active: Optional[bool] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class CouponOut(CouponBase):
    id: int
    times_used: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class CouponValidateRequest(BaseModel):
    code: str
    subtotal: float = 0


class CouponValidateResponse(BaseModel):
    valid: bool
    code: str = ""
    discount_percent: float = 0
    discount_amount: float = 0
    message: str = ""


# ---------- Offers (Buy X Get Y) ----------
class OfferBase(BaseModel):
    name: str
    buy_quantity: int = Field(ge=1)
    get_quantity: int = Field(ge=1)
    scope: models.OfferScope = models.OfferScope.all
    category: Optional[str] = None
    product_ids: List[int] = Field(default_factory=list)
    is_active: bool = True
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class OfferCreate(OfferBase):
    pass


class OfferUpdate(BaseModel):
    name: Optional[str] = None
    buy_quantity: Optional[int] = Field(default=None, ge=1)
    get_quantity: Optional[int] = Field(default=None, ge=1)
    scope: Optional[models.OfferScope] = None
    category: Optional[str] = None
    product_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class OfferOut(OfferBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Cart quote (live totals preview) ----------
class QuoteRequest(BaseModel):
    items: List[OrderItemIn]
    coupon_code: Optional[str] = None


class QuoteOut(BaseModel):
    subtotal: float
    discount: float = 0
    offer_label: str = ""
    coupon_code: str = ""
    coupon_discount: float = 0
    shipping_fee: float
    total: float


# ---------- Store settings (admin-editable) ----------
class SettingsOut(BaseModel):
    delivery_fee: float
    free_shipping_threshold: float


class SettingsUpdate(BaseModel):
    delivery_fee: Optional[float] = Field(default=None, ge=0)
    free_shipping_threshold: Optional[float] = Field(default=None, ge=0)


class PublicShippingSettings(BaseModel):
    delivery_fee: float
    free_shipping_threshold: float
