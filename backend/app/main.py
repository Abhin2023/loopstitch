import os
import re
import uuid
import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from . import models, schemas, auth
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Loopstitch Co. API", version="1.0.0")

# CORS - allow the storefront + local dev to call the API
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,https://loopstitch.online,https://www.loopstitch.online").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "products")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")), name="uploads")

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


def _utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def unique_slug(db: Session, base: str, exclude_id: Optional[int] = None) -> str:
    slug = base or "product"
    counter = 1
    while True:
        q = db.query(models.Product).filter(models.Product.slug == slug)
        if exclude_id is not None:
            q = q.filter(models.Product.id != exclude_id)
        if not q.first():
            return slug
        counter += 1
        slug = f"{base}-{counter}"


# ============================================================
# HEALTH
# ============================================================
@app.get("/api/health")
def health():
    return {"status": "ok", "brand": "Loopstitch Co."}


# ============================================================
# ADMIN AUTH  (hidden route — no signup endpoint exists at all)
# ============================================================
@app.post("/api/admin/login", response_model=schemas.TokenResponse)
def admin_login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(models.Admin).filter(models.Admin.username == payload.username).first()
    if not admin or not auth.verify_password(payload.password, admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    token = auth.create_access_token({"sub": admin.username})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/admin/me")
def admin_me(current: models.Admin = Depends(auth.get_current_admin)):
    return {"username": current.username}


# ============================================================
# PUBLIC PRODUCT ROUTES
# ============================================================
@app.get("/api/products", response_model=List[schemas.ProductOut])
def list_products(
    category: Optional[str] = None,
    featured: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Product).options(
        joinedload(models.Product.images), joinedload(models.Product.sizes)
    ).filter(models.Product.is_active == True)  # noqa: E712
    if category:
        q = q.filter(models.Product.category == category)
    if featured is not None:
        q = q.filter(models.Product.is_featured == featured)
    products = q.order_by(models.Product.created_at.desc()).all()
    return products


@app.get("/api/products/{slug}", response_model=schemas.ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).options(
        joinedload(models.Product.images), joinedload(models.Product.sizes)
    ).filter(models.Product.slug == slug, models.Product.is_active == True).first()  # noqa: E712
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ============================================================
# ADMIN PRODUCT ROUTES (protected)
# ============================================================
@app.get("/api/admin/products", response_model=List[schemas.ProductOut])
def admin_list_products(db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    products = db.query(models.Product).options(
        joinedload(models.Product.images), joinedload(models.Product.sizes)
    ).order_by(models.Product.created_at.desc()).all()
    return products


@app.get("/api/admin/products/{product_id}", response_model=schemas.ProductOut)
def admin_get_product(product_id: int, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    product = db.query(models.Product).options(
        joinedload(models.Product.images), joinedload(models.Product.sizes)
    ).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/api/admin/products", response_model=schemas.ProductOut)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    slug = unique_slug(db, slugify(payload.name))
    product = models.Product(
        name=payload.name, slug=slug, description=payload.description, price=payload.price,
        compare_at_price=payload.compare_at_price, category=payload.category, colorway=payload.colorway,
        is_active=payload.is_active, is_featured=payload.is_featured,
    )
    db.add(product)
    db.flush()
    for s in payload.sizes:
        db.add(models.ProductSize(product_id=product.id, size=s.size, stock=s.stock))
    db.commit()
    db.refresh(product)
    return product


@app.put("/api/admin/products/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    data = payload.model_dump(exclude_unset=True)
    sizes = data.pop("sizes", None)

    if "name" in data and data["name"] != product.name:
        product.slug = unique_slug(db, slugify(data["name"]), exclude_id=product.id)

    for key, value in data.items():
        setattr(product, key, value)

    if sizes is not None:
        existing_sizes = {s.size: s for s in product.sizes}
        incoming_sizes = {s["size"] for s in sizes}
        for size, row in existing_sizes.items():
            if size not in incoming_sizes:
                db.delete(row)
        for s in sizes:
            if s["size"] in existing_sizes:
                existing_sizes[s["size"]].stock = s["stock"]
            else:
                db.add(models.ProductSize(product_id=product.id, size=s["size"], stock=s["stock"]))

    product.updated_at = _utcnow()
    db.commit()
    db.refresh(product)
    return product


@app.delete("/api/admin/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for img in product.images:
        try:
            fpath = os.path.join(os.path.dirname(os.path.dirname(__file__)), img.url.lstrip("/"))
            if os.path.exists(fpath):
                os.remove(fpath)
        except OSError:
            pass
    db.delete(product)
    db.commit()
    return {"detail": "Product deleted"}


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@app.post("/api/admin/products/{product_id}/images", response_model=schemas.ProductOut)
async def upload_product_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current: models.Admin = Depends(auth.get_current_admin),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for file in files:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
        contents = b""
        while chunk := await file.read(8192):
            contents += chunk
            if len(contents) > MAX_UPLOAD_SIZE:
                raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")

        ext = os.path.splitext(file.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(UPLOAD_DIR, fname)
        with open(path, "wb") as f:
            f.write(contents)

        position = db.query(models.ProductImage).filter(
            models.ProductImage.product_id == product_id
        ).count()
        db.add(models.ProductImage(
            product_id=product_id, url=f"/uploads/products/{fname}", position=position
        ))

    db.commit()
    db.refresh(product)
    return product


@app.delete("/api/admin/products/{product_id}/images/{image_id}", response_model=schemas.ProductOut)
def delete_product_image(product_id: int, image_id: int, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    image = db.query(models.ProductImage).filter(
        models.ProductImage.id == image_id, models.ProductImage.product_id == product_id
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        fpath = os.path.join(os.path.dirname(os.path.dirname(__file__)), image.url.lstrip("/"))
        if os.path.exists(fpath):
            os.remove(fpath)
    except OSError:
        pass
    db.delete(image)
    db.commit()
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    return product


# ============================================================
# ORDERS (checkout is public; management is admin-only)
# ============================================================
def generate_order_number() -> str:
    return "LSC" + _utcnow().strftime("%y%m%d") + uuid.uuid4().hex[:5].upper()


SHIPPING_FEE = 79.0
FREE_SHIPPING_THRESHOLD = 1499.0


@app.post("/api/orders", response_model=schemas.OrderOut)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    order = models.Order(
        order_number=generate_order_number(),
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        shipping_address=payload.shipping_address,
        city=payload.city, state=payload.state, pincode=payload.pincode,
        status=models.OrderStatus.pending,
    )
    db.add(order)
    db.flush()

    subtotal = 0.0
    for line in payload.items:
        product = db.query(models.Product).filter(models.Product.id == line.product_id, models.Product.is_active == True).first()  # noqa: E712
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {line.product_id} not found")

        size_row = db.query(models.ProductSize).filter(
            models.ProductSize.product_id == product.id, models.ProductSize.size == line.size
        ).with_for_update().first()
        if not size_row:
            raise HTTPException(status_code=400, detail=f"Size {line.size} not available for {product.name}")
        if size_row.stock < line.quantity:
            raise HTTPException(
                status_code=409,
                detail=f"Only {size_row.stock} left for {product.name} (size {line.size}). Please lower the quantity."
            )

        size_row.stock -= line.quantity

        unit_price = product.price
        subtotal += unit_price * line.quantity

        db.add(models.OrderItem(
            order_id=order.id, product_id=product.id, product_name=product.name,
            size=line.size, quantity=line.quantity, unit_price=unit_price,
        ))

    shipping_fee = 0.0 if subtotal >= FREE_SHIPPING_THRESHOLD else SHIPPING_FEE
    order.subtotal = subtotal
    order.shipping_fee = shipping_fee
    order.total = subtotal + shipping_fee

    db.commit()
    db.refresh(order)
    return order


@app.get("/api/orders/{order_number}", response_model=schemas.OrderOut)
def get_order_by_number(order_number: str, token: Optional[str] = Depends(auth.oauth2_scheme), db: Session = Depends(get_db)):
    order = db.query(models.Order).options(joinedload(models.Order.items)).filter(
        models.Order.order_number == order_number
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if token is None:
        email_from_query = None
        raise HTTPException(status_code=401, detail="Authentication required to view orders")
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    return order


@app.get("/api/orders/{order_number}/invoice")
def download_order_invoice(order_number: str, token: Optional[str] = Depends(auth.oauth2_scheme), db: Session = Depends(get_db)):
    from .invoice import generate_invoice_pdf
    order = db.query(models.Order).options(joinedload(models.Order.items)).filter(
        models.Order.order_number == order_number
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if token is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    pdf_bytes = generate_invoice_pdf(order)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice-{order.order_number}.pdf"'},
    )


@app.get("/api/admin/orders", response_model=List[schemas.OrderOut])
def admin_list_orders(db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    orders = db.query(models.Order).options(joinedload(models.Order.items)).order_by(models.Order.created_at.desc()).all()
    return orders


@app.patch("/api/admin/orders/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(order_id: int, payload: schemas.OrderStatusUpdate, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    order = db.query(models.Order).options(joinedload(models.Order.items)).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order


@app.get("/api/admin/orders/{order_id}/invoice")
def admin_download_invoice(order_id: int, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    from .invoice import generate_invoice_pdf
    order = db.query(models.Order).options(joinedload(models.Order.items)).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    pdf_bytes = generate_invoice_pdf(order)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice-{order.order_number}.pdf"'},
    )


# ============================================================
# ADMIN DASHBOARD STATS
# ============================================================
@app.get("/api/admin/stats")
def admin_stats(db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    total_products = db.query(models.Product).count()
    total_orders = db.query(models.Order).count()
    revenue_sum = db.query(func.coalesce(func.sum(models.Order.total), 0.0)).filter(
        models.Order.status != models.OrderStatus.cancelled
    ).scalar()
    low_stock = db.query(models.ProductSize).filter(models.ProductSize.stock <= 3, models.ProductSize.stock > 0).count()
    out_of_stock = db.query(models.ProductSize).filter(models.ProductSize.stock == 0).count()
    return {
        "total_products": total_products,
        "total_orders": total_orders,
        "revenue": float(revenue_sum),
        "low_stock_sizes": low_stock,
        "out_of_stock_sizes": out_of_stock,
    }
