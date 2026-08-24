import os
import re
import uuid
import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, HTMLResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from . import models, schemas, auth
from .database import engine, get_db
from .offers import compute_best_offer, get_shipping_config, set_setting, shipping_fee_for, validate_coupon, apply_coupon_discount
from . import payu
from .payu import verify_hash_valid

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
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


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


@app.post("/api/orders")
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Validate payment method
    payment_method = payload.payment_method if payload.payment_method in ("cod", "online") else "cod"
    raw_settings = {r.key: r.value for r in db.query(models.Setting).all()}

    if payment_method == "cod" and raw_settings.get("cod_enabled", "false") != "true":
        raise HTTPException(status_code=400, detail="Cash on delivery is not available. Please choose online payment.")

    if payment_method == "online":
        payu_key = raw_settings.get("payu_key", "")
        payu_salt = raw_settings.get("payu_salt", "")
        if not payu_key or not payu_salt:
            raise HTTPException(status_code=400, detail="Online payment is not configured. Please try again later.")

    order = models.Order(
        order_number=generate_order_number(),
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        shipping_address=payload.shipping_address,
        city=payload.city, state=payload.state, pincode=payload.pincode,
        status=models.OrderStatus.pending,
        payment_method=payment_method,
    )
    db.add(order)
    db.flush()

    subtotal = 0.0
    cart_ctx = []  # discount-engine context: product + line info
    item_rows = []
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

        item_rows.append(models.OrderItem(
            order_id=order.id, product_id=product.id, product_name=product.name,
            size=line.size, quantity=line.quantity, unit_price=unit_price,
        ))
        cart_ctx.append({
            "product_id": product.id, "size": line.size, "quantity": line.quantity,
            "unit_price": unit_price, "product": product,
        })

    # ---- Buy X Get Y (best offer wins) ----
    best = compute_best_offer(db, cart_ctx)
    if best:
        order.discount_amount = best["discount"]
        order.offer_id = best["offer_id"]
        order.offer_label = best["label"]
        for row in item_rows:
            row.line_discount = round(best["line_discounts"].get((row.product_id, row.size), 0.0), 2)

    # ---- Coupon (percentage off the BOGO-discounted merchandise value) ----
    subtotal_after_bogo = round(subtotal - (order.discount_amount or 0.0), 2)
    coupon_info = validate_coupon(db, payload.coupon_code, subtotal)
    if coupon_info:
        order.coupon_id = coupon_info["coupon_id"]
        order.coupon_code = coupon_info["code"]
        order.coupon_discount = apply_coupon_discount(subtotal_after_bogo, coupon_info)
        # record the use (atomic increment)
        db.query(models.Coupon).filter(models.Coupon.id == coupon_info["coupon_id"]).update(
            {models.Coupon.times_used: models.Coupon.times_used + 1}
        )

    # free-shipping judged on pre-discount subtotal (editable in admin settings)
    config = get_shipping_config(db)
    shipping_fee = shipping_fee_for(subtotal, config)

    order.subtotal = subtotal
    order.shipping_fee = shipping_fee
    order.total = round(subtotal_after_bogo - (order.coupon_discount or 0.0) + shipping_fee, 2)

    for row in item_rows:
        db.add(row)

    db.commit()
    db.refresh(order)

    # For online payments, generate PayU hash and return form data
    if payment_method == "online":
        payu_key = raw_settings.get("payu_key", "")
        payu_salt = raw_settings.get("payu_salt", "")
        is_test = raw_settings.get("payu_test_mode", "true") == "true"

        amount_str = f"{order.total:.2f}"
        product_info = "Loopstitch Order"
        txnid = order.order_number
        firstname = order.customer_name
        email = order.customer_email
        phone = order.customer_phone

        base_url = "https://loopstitch.online"
        surl = f"{base_url}/order/confirm"
        furl = f"{base_url}/order/confirm"

        hash_val = payu.generate_hash(
            key=payu_key, salt=payu_salt, txnid=txnid,
            amount=amount_str, productinfo=product_info,
            firstname=firstname, email=email, udf1=txnid,
        )

        return {
            "order": schemas.OrderOut.model_validate(order).model_dump(),
            "payu_form_data": {
                "payment_url": payu.payment_url(is_test),
                "key": payu_key,
                "txnid": txnid,
                "amount": amount_str,
                "productinfo": product_info,
                "firstname": firstname,
                "email": email,
                "phone": phone,
                "surl": surl,
                "furl": furl,
                "hash": hash_val,
                "udf1": txnid,
            },
        }

    return {"order": schemas.OrderOut.model_validate(order).model_dump()}


@app.post("/api/cart/quote", response_model=schemas.QuoteOut)
def cart_quote(payload: schemas.QuoteRequest, db: Session = Depends(get_db)):
    """Live totals preview (subtotal / discount / shipping) — no stock changes, no order."""
    from .offers import active_offers as _  # noqa: F401  (engine imported at module load)

    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    subtotal = 0.0
    cart_ctx = []
    for line in payload.items:
        product = db.query(models.Product).filter(
            models.Product.id == line.product_id, models.Product.is_active == True  # noqa: E712
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {line.product_id} not found")
        subtotal += product.price * line.quantity
        cart_ctx.append({
            "product_id": product.id, "size": line.size, "quantity": line.quantity,
            "unit_price": product.price, "product": product,
        })

    best = compute_best_offer(db, cart_ctx)
    discount = best["discount"] if best else 0.0
    label = best["label"] if best else ""

    # ---- Coupon ----
    subtotal_after_bogo = round(subtotal - discount, 2)
    coupon_info = validate_coupon(db, payload.coupon_code, subtotal)
    coupon_discount = apply_coupon_discount(subtotal_after_bogo, coupon_info)
    coupon_code = coupon_info["code"] if coupon_info else ""

    config = get_shipping_config(db)
    fee = shipping_fee_for(subtotal, config)

    return {
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "offer_label": label,
        "coupon_code": coupon_code,
        "coupon_discount": round(coupon_discount, 2),
        "shipping_fee": round(fee, 2),
        "total": round(subtotal_after_bogo - coupon_discount + fee, 2),
    }


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
# STORE SETTINGS  (delivery fee etc. — editable from admin)
# ============================================================
# SETTINGS (delivery + PayU + COD — admin managed)
# ============================================================
def _get_all_settings(db: Session) -> dict:
    """Read all settings from the DB into a flat dict."""
    rows = db.query(models.Setting).all()
    return {r.key: r.value for r in rows}


def _build_settings_out(db: Session) -> schemas.SettingsOut:
    raw = _get_all_settings(db)
    salt_full = raw.get("payu_salt", "")
    salt_masked = ("***" + salt_full[-4:]) if len(salt_full) > 4 else salt_full
    return schemas.SettingsOut(
        delivery_fee=float(raw.get("delivery_fee", 45)),
        free_shipping_threshold=float(raw.get("free_shipping_threshold", 1000)),
        payu_key=raw.get("payu_key", ""),
        payu_salt=salt_masked,
        payu_test_mode=raw.get("payu_test_mode", "true") == "true",
        cod_enabled=raw.get("cod_enabled", "false") == "true",
    )


@app.get("/api/settings/shipping", response_model=schemas.PublicShippingSettings)
def public_shipping_settings(db: Session = Depends(get_db)):
    return get_shipping_config(db)


@app.get("/api/settings/checkout", response_model=schemas.PublicCheckoutSettings)
def public_checkout_settings(db: Session = Depends(get_db)):
    raw = _get_all_settings(db)
    return schemas.PublicCheckoutSettings(
        cod_enabled=raw.get("cod_enabled", "false") == "true",
    )


@app.get("/api/admin/settings", response_model=schemas.SettingsOut)
def admin_get_settings(db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    return _build_settings_out(db)


@app.patch("/api/admin/settings", response_model=schemas.SettingsOut)
def admin_update_settings(payload: schemas.SettingsUpdate, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    if payload.delivery_fee is not None:
        set_setting(db, "delivery_fee", str(round(float(payload.delivery_fee), 2)))
    if payload.free_shipping_threshold is not None:
        set_setting(db, "free_shipping_threshold", str(round(float(payload.free_shipping_threshold), 2)))
    if payload.payu_key is not None:
        set_setting(db, "payu_key", payload.payu_key.strip())
    if payload.payu_salt is not None:
        # If the salt is masked (starts with ***) keep the old value
        salt_val = payload.payu_salt.strip()
        if not salt_val.startswith("***"):
            set_setting(db, "payu_salt", salt_val)
    if payload.payu_test_mode is not None:
        set_setting(db, "payu_test_mode", "true" if payload.payu_test_mode else "false")
    if payload.cod_enabled is not None:
        set_setting(db, "cod_enabled", "true" if payload.cod_enabled else "false")
    db.commit()
    return _build_settings_out(db)


# ============================================================
# PAYU WEBHOOK  (PayU POSTs here on payment success/failure)
# ============================================================
@app.post("/api/webhooks/payu")
async def payu_webhook(request: Request, db: Session = Depends(get_db)):
    """Public endpoint — PayU sends form-encoded payment notifications here."""
    from urllib.parse import parse_qs

    body = await request.body()
    params = {k: v[0] if isinstance(v, list) else v for k, v in parse_qs(body.decode("utf-8")).items()}

    txnid = params.get("txnid", "")
    payu_status = params.get("status", "")
    mihpayid = params.get("mihpayid", "")

    if not txnid:
        return Response(status_code=200)

    # Look up the order by txnid stored in udf1 (our order_number)
    order = db.query(models.Order).filter(models.Order.order_number == txnid).first()
    if not order:
        # try matching by payu_txnid if this is a retry
        return Response(status_code=200)

    # Verify hash
    raw = {r.key: r.value for r in db.query(models.Setting).all()}
    salt = raw.get("payu_salt", "")
    if salt:
        if not verify_hash_valid(salt, params):
            return Response(status_code=200)  # invalid hash — ignore

    # Update order based on status
    if payu_status.lower() == "success":
        order.status = models.OrderStatus.paid
        order.payu_txnid = mihpayid
    elif payu_status.lower() in ("failure", "bounced", "dropped", "usercancelled"):
        order.status = models.OrderStatus.cancelled
        order.payu_txnid = mihpayid
        # Restore stock
        for item in order.items:
            size_row = db.query(models.ProductSize).filter(
                models.ProductSize.product_id == item.product_id,
                models.ProductSize.size == item.size,
            ).with_for_update().first()
            if size_row:
                size_row.stock += item.quantity

    db.commit()
    return Response(status_code=200)


@app.post("/api/payu/verify/{order_number}")
def payu_verify_order(order_number: str, db: Session = Depends(get_db)):
    """Fallback verification — calls PayU verify_payment API."""
    order = db.query(models.Order).options(joinedload(models.Order.items)).filter(
        models.Order.order_number == order_number
    ).first()
    if not order or order.payment_method != "online":
        raise HTTPException(status_code=404, detail="Order not found")

    raw = {r.key: r.value for r in db.query(models.Setting).all()}
    key = raw.get("payu_key", "")
    salt = raw.get("payu_salt", "")
    is_test = raw.get("payu_test_mode", "true") == "true"

    if not key or not salt:
        raise HTTPException(status_code=400, detail="PayU credentials not configured")

    txnid = order.order_number
    result = payu.verify_payment_api(key, salt, txnid, is_test)
    if not result:
        raise HTTPException(status_code=502, detail="Could not verify with PayU")

    status_info = result.get("status", -1)
    if isinstance(status_info, dict) and status_info.get("result") == "success":
        txn = status_info.get("transaction_details", {}).get(txnid, {})
        if txn.get("status") == "success":
            order.status = models.OrderStatus.paid
            order.payu_txnid = txn.get("mihpayid", "")
            db.commit()
            return {"verified": True, "status": "paid"}

    return {"verified": False, "status": order.status.value}


# ============================================================
# OFFERS  (Buy X Get Y — admin managed, applied at checkout)
# ============================================================
def _offer_product_ids(offer: models.Offer) -> List[int]:
    ids = []
    for part in (offer.product_ids or "").split(","):
        part = part.strip()
        if part.isdigit():
            ids.append(int(part))
    return ids


def _offer_out(offer: models.Offer) -> schemas.OfferOut:
    return schemas.OfferOut(
        id=offer.id,
        name=offer.name,
        buy_quantity=offer.buy_quantity,
        get_quantity=offer.get_quantity,
        scope=offer.scope,
        category=offer.category or None,
        product_ids=_offer_product_ids(offer),
        is_active=offer.is_active,
        starts_at=offer.starts_at,
        ends_at=offer.ends_at,
        created_at=offer.created_at,
    )


def _apply_offer_fields(offer: models.Offer, payload) -> None:
    offer.name = payload.name.strip()
    offer.buy_quantity = payload.buy_quantity
    offer.get_quantity = payload.get_quantity
    offer.scope = payload.scope
    offer.category = (payload.category or "") if payload.scope == models.OfferScope.category else ""
    if payload.scope == models.OfferScope.products:
        unique_ids = sorted(set(int(pid) for pid in payload.product_ids))
        offer.product_ids = ",".join(str(pid) for pid in unique_ids)
    else:
        offer.product_ids = ""
    offer.is_active = payload.is_active
    offer.starts_at = payload.starts_at
    offer.ends_at = payload.ends_at


@app.get("/api/admin/offers")
def admin_list_offers(db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    offers = db.query(models.Offer).order_by(models.Offer.created_at.desc()).all()
    return [_offer_out(o) for o in offers]


@app.post("/api/admin/offers")
def admin_create_offer(payload: schemas.OfferCreate, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    offer = models.Offer(created_at=_utcnow())
    _apply_offer_fields(offer, payload)
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return _offer_out(offer)


@app.put("/api/admin/offers/{offer_id}")
def admin_update_offer(offer_id: int, payload: schemas.OfferUpdate, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    merged = schemas.OfferCreate(
        name=payload.name if payload.name is not None else offer.name,
        buy_quantity=payload.buy_quantity if payload.buy_quantity is not None else offer.buy_quantity,
        get_quantity=payload.get_quantity if payload.get_quantity is not None else offer.get_quantity,
        scope=payload.scope if payload.scope is not None else offer.scope,
        category=payload.category if payload.category is not None else offer.category,
        product_ids=payload.product_ids if payload.product_ids is not None else _offer_product_ids(offer),
        is_active=payload.is_active if payload.is_active is not None else offer.is_active,
        starts_at=payload.starts_at if payload.starts_at is not None else offer.starts_at,
        ends_at=payload.ends_at if payload.ends_at is not None else offer.ends_at,
    )
    _apply_offer_fields(offer, merged)
    db.commit()
    db.refresh(offer)
    return _offer_out(offer)


@app.patch("/api/admin/offers/{offer_id}/toggle")
def admin_toggle_offer(offer_id: int, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    offer.is_active = not offer.is_active
    db.commit()
    return {"id": offer.id, "is_active": offer.is_active}


@app.delete("/api/admin/offers/{offer_id}")
def admin_delete_offer(offer_id: int, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    db.delete(offer)
    db.commit()
    return {"detail": "Offer deleted"}


# ============================================================
# COUPONS  (percentage discount codes — validated at checkout)
# ============================================================
@app.post("/api/coupons/validate", response_model=schemas.CouponValidateResponse)
def validate_coupon_api(payload: schemas.CouponValidateRequest, db: Session = Depends(get_db)):
    """Public endpoint: validate a coupon code and return the discount info."""
    coupon_info = validate_coupon(db, payload.code, payload.subtotal)
    if not coupon_info:
        return schemas.CouponValidateResponse(valid=False, message="Invalid or expired coupon code.")
    discount_amount = apply_coupon_discount(payload.subtotal, coupon_info)
    return schemas.CouponValidateResponse(
        valid=True,
        code=coupon_info["code"],
        discount_percent=coupon_info["discount_percent"],
        discount_amount=discount_amount,
        message=f"{coupon_info['discount_percent']:.0f}% off applied!",
    )


@app.get("/api/admin/coupons")
def admin_list_coupons(db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    coupons = db.query(models.Coupon).order_by(models.Coupon.created_at.desc()).all()
    return coupons


@app.post("/api/admin/coupons")
def admin_create_coupon(payload: schemas.CouponCreate, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    code = payload.code.strip().upper()
    if db.query(models.Coupon).filter(models.Coupon.code == code).first():
        raise HTTPException(status_code=400, detail="A coupon with this code already exists.")
    coupon = models.Coupon(
        code=code, discount_percent=payload.discount_percent,
        max_uses=payload.max_uses, min_order=payload.min_order,
        is_active=payload.is_active, starts_at=payload.starts_at,
        ends_at=payload.ends_at, created_at=_utcnow(),
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


@app.put("/api/admin/coupons/{coupon_id}")
def admin_update_coupon(coupon_id: int, payload: schemas.CouponUpdate, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    if payload.code is not None:
        new_code = payload.code.strip().upper()
        existing = db.query(models.Coupon).filter(models.Coupon.code == new_code, models.Coupon.id != coupon_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="A coupon with this code already exists.")
        coupon.code = new_code
    if payload.discount_percent is not None:
        coupon.discount_percent = payload.discount_percent
    if payload.max_uses is not None:
        coupon.max_uses = payload.max_uses
    if payload.min_order is not None:
        coupon.min_order = payload.min_order
    if payload.is_active is not None:
        coupon.is_active = payload.is_active
    if payload.starts_at is not None:
        coupon.starts_at = payload.starts_at
    if payload.ends_at is not None:
        coupon.ends_at = payload.ends_at
    db.commit()
    db.refresh(coupon)
    return coupon


@app.patch("/api/admin/coupons/{coupon_id}/toggle")
def admin_toggle_coupon(coupon_id: int, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    coupon.is_active = not coupon.is_active
    db.commit()
    return {"id": coupon.id, "is_active": coupon.is_active}


@app.delete("/api/admin/coupons/{coupon_id}")
def admin_delete_coupon(coupon_id: int, db: Session = Depends(get_db), current: models.Admin = Depends(auth.get_current_admin)):
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(coupon)
    db.commit()
    return {"detail": "Coupon deleted"}


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
