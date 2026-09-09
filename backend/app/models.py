import datetime
import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum,
    UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from .database import Base


def _utcnow():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=_utcnow)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(220), unique=True, index=True, nullable=False)
    description = Column(Text, default="")
    price = Column(Float, nullable=False)
    compare_at_price = Column(Float, nullable=True)  # for "was ₹X" strike-through
    category = Column(String(100), default="tshirt", index=True)  # tshirt / hoodie / etc
    colorway = Column(String(100), default="")
    is_active = Column(Boolean, default=True, index=True)
    is_featured = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.position")
    sizes = relationship("ProductSize", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")

    @property
    def total_stock(self):
        return sum(s.stock for s in self.sizes)


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    url = Column(String(500), nullable=False)
    position = Column(Integer, default=0)

    product = relationship("Product", back_populates="images")


class ProductSize(Base):
    """Per-size stock. When stock hits 0 that size auto-locks (Sold Out) on the frontend."""
    __tablename__ = "product_sizes"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    size = Column(String(20), nullable=False)  # S, M, L, XL, XXL
    stock = Column(Integer, default=0)

    product = relationship("Product", back_populates="sizes")

    __table_args__ = (
        UniqueConstraint("product_id", "size", name="uq_product_size"),
    )


class OrderStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    failed = "failed"


class OfferScope(str, enum.Enum):
    all = "all"
    category = "category"
    products = "products"


class Setting(Base):
    """Editable store configuration (delivery fee, thresholds, ...)."""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(String(200), default="")
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class Offer(Base):
    """Buy X Get Y promotion. scope decides which cart items are eligible."""
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    buy_quantity = Column(Integer, nullable=False, default=1)
    get_quantity = Column(Integer, nullable=False, default=1)
    scope = Column(Enum(OfferScope), default=OfferScope.all, nullable=False)
    category = Column(String(100), default="")  # used when scope == category
    product_ids = Column(Text, default="")      # comma-separated product ids when scope == products
    is_active = Column(Boolean, default=True, index=True)
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utcnow)


class Coupon(Base):
    """Percentage discount code. Validated at checkout; counts total uses."""
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    discount_percent = Column(Float, nullable=False)  # e.g. 10 means 10 % off
    max_uses = Column(Integer, default=0)              # 0 = unlimited
    times_used = Column(Integer, default=0)
    min_order = Column(Float, default=0.0)             # minimum subtotal to qualify
    is_active = Column(Boolean, default=True, index=True)
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utcnow)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(40), unique=True, index=True, nullable=False)
    customer_name = Column(String(150), nullable=False)
    customer_email = Column(String(150), nullable=False)
    customer_phone = Column(String(30), nullable=False)
    shipping_address = Column(Text, nullable=False)
    city = Column(String(100), default="")
    state = Column(String(100), default="")
    pincode = Column(String(20), default="")
    status = Column(Enum(OrderStatus), default=OrderStatus.pending, index=True)
    subtotal = Column(Float, default=0)
    discount_amount = Column(Float, default=0)
    offer_id = Column(Integer, nullable=True)  # offer applied at purchase time (no FK: survives offer deletion)
    offer_label = Column(String(200), default="")
    coupon_id = Column(Integer, nullable=True)
    coupon_code = Column(String(50), default="")
    coupon_discount = Column(Float, default=0)
    shipping_fee = Column(Float, default=0)
    total = Column(Float, default=0)
    payment_method = Column(String(20), default="cod")  # "cod" or "online"
    razorpay_order_id = Column(String(100), default="")
    razorpay_payment_id = Column(String(100), default="")
    razorpay_signature = Column(String(200), default="")
    cod_advance_paid = Column(Float, default=0.0)   # amount paid online for COD orders
    cod_advance_percent = Column(Float, default=0.0) # percentage charged upfront
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    customer = relationship("Customer", back_populates="orders")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product_name = Column(String(200), nullable=False)  # snapshot, survives product deletion
    size = Column(String(20), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    line_discount = Column(Float, default=0)  # total discount attributed to this line (BOGO free items)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Notification(Base):
    """WhatsApp notification sent for an order."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    order_number = Column(String(40), nullable=False)
    customer_name = Column(String(150), nullable=False)
    customer_phone = Column(String(30), nullable=False)
    message_type = Column(String(30), default="order_confirm")
    whatsapp_message_id = Column(String(200), default="")
    status = Column(String(20), default="pending", index=True)  # pending / sent / delivered / read / failed
    error_message = Column(Text, default="")
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    order = relationship("Order")


class Customer(Base):
    """Store customer — auto-created on first order, can log in via phone OTP."""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    phone = Column(String(30), unique=True, index=True, nullable=False)
    email = Column(String(150), default="")
    created_at = Column(DateTime, default=_utcnow)

    addresses = relationship("Address", back_populates="customer", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="customer")


class Address(Base):
    """Saved shipping address for a customer."""
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    full_address = Column(Text, nullable=False)
    city = Column(String(100), default="")
    state = Column(String(100), default="")
    pincode = Column(String(20), default="")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)

    customer = relationship("Customer", back_populates="addresses")


class OTP(Base):
    """One-time password for phone-based login. Expires in 5 minutes."""
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(30), nullable=False, index=True)
    otp_code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)
