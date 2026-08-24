"""
Buy X Get Y discount engine.

All pricing decisions happen here so both the quote endpoint and order
creation apply identical logic. Server-side only — the client can display
results but never dictates prices.
"""
import datetime
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from . import models


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------- settings
def get_setting(db: Session, key: str, default: str = "") -> str:
    row = db.query(models.Setting).filter(models.Setting.key == key).first()
    return row.value if row else default


def get_setting_float(db: Session, key: str, default: float) -> float:
    raw = get_setting(db, key)
    try:
        return float(raw)
    except (TypeError, ValueError):
        return float(default)


def set_setting(db: Session, key: str, value: str) -> None:
    row = db.query(models.Setting).filter(models.Setting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(models.Setting(key=key, value=value))


def get_shipping_config(db: Session) -> Dict[str, float]:
    """Delivery fee + free-shipping threshold from editable admin settings."""
    return {
        "delivery_fee": get_setting_float(db, "delivery_fee", 45.0),
        "free_shipping_threshold": get_setting_float(db, "free_shipping_threshold", 1000.0),
    }


def shipping_fee_for(subtotal: float, config: Dict[str, float]) -> float:
    """Free shipping is judged on the PRE-discount merchandise value."""
    return 0.0 if subtotal >= config["free_shipping_threshold"] else config["delivery_fee"]


# ---------------------------------------------------------------- offers
def active_offers(db: Session) -> List[models.Offer]:
    now = _utcnow()
    rows = db.query(models.Offer).filter(models.Offer.is_active == True).all()  # noqa: E712
    result = []
    for offer in rows:
        if offer.starts_at is not None and offer.starts_at > now:
            continue
        if offer.ends_at is not None and offer.ends_at < now:
            continue
        result.append(offer)
    return result


def parse_product_ids(raw: str) -> List[int]:
    ids = []
    for part in (raw or "").split(","):
        part = part.strip()
        if part.isdigit():
            ids.append(int(part))
    return ids


def offer_label(offer: models.Offer) -> str:
    base = f"Buy {offer.buy_quantity} Get {offer.get_quantity}"
    if offer.scope == models.OfferScope.category and offer.category:
        base += f" · {offer.category}"
    elif offer.scope == models.OfferScope.products:
        base += " · selected items"
    return base


def _eligible_lines(lines: List[dict], offer: models.Offer) -> List[dict]:
    scope = offer.scope
    if scope == models.OfferScope.all:
        return list(lines)
    if scope == models.OfferScope.category:
        return [l for l in lines if l["product"].category == offer.category]
    if scope == models.OfferScope.products:
        allowed = set(parse_product_ids(offer.product_ids))
        return [l for l in lines if l["product_id"] in allowed]
    return []


def compute_best_offer(
    db: Session,
    lines: List[dict],
) -> Optional[Dict]:
    """
    lines: [{"product_id", "size", "quantity", "unit_price", "product"}]
           product must be the models.Product instance.

    Returns the best single offer application:
      {offer_id, label, discount, line_discounts: {(product_id, size): amount}}
    or None when nothing applies.
    """
    best: Optional[Dict] = None

    try:
        offers = active_offers(db)
    except Exception:
        return None

    for offer in offers:
        try:
            eligible = _eligible_lines(lines, offer)
            total_units = sum(l["quantity"] for l in eligible)
            if total_units < offer.buy_quantity:
                continue
            # group-based rule: every complete (buy + get) set yields `get` free units.
            # e.g. Buy2Get1 with 5 units -> floor(5/3)=1 complete set -> 1 free.
            group_size = offer.buy_quantity + offer.get_quantity
            free_units = (total_units // group_size) * offer.get_quantity
            if free_units <= 0:
                continue

            # cheapest units become the free ones (standard retail BOGO practice)
            units = sorted(
                ((l["unit_price"], (l["product_id"], l["size"])) for l in eligible for _ in range(l["quantity"])),
                key=lambda u: u[0],
            )
            cheapest = units[:free_units]

            discount = 0.0
            line_discounts: Dict[tuple, float] = {}
            for price, key in cheapest:
                discount += price
                line_discounts[key] = line_discounts.get(key, 0.0) + price

            candidate = {
                "offer_id": offer.id,
                "label": offer.name or offer_label(offer),
                "discount": round(discount, 2),
                "line_discounts": line_discounts,
            }
            if best is None or candidate["discount"] > best["discount"]:
                best = candidate
        except Exception:
            continue

    return best


# ---------------------------------------------------------------- coupons
def validate_coupon(db: Session, code: str, subtotal: float = 0.0) -> Optional[Dict]:
    """Validate a coupon and return info dict, or None if invalid."""
    code = (code or "").strip().upper()
    if not code:
        return None

    coupon = db.query(models.Coupon).filter(
        models.Coupon.code == code,
        models.Coupon.is_active == True,  # noqa: E712
    ).first()
    if not coupon:
        return None

    now = _utcnow()
    if coupon.starts_at and coupon.starts_at > now:
        return None
    if coupon.ends_at and coupon.ends_at < now:
        return None
    if coupon.max_uses > 0 and coupon.times_used >= coupon.max_uses:
        return None
    if subtotal < coupon.min_order:
        return None

    return {
        "coupon_id": coupon.id,
        "code": coupon.code,
        "discount_percent": coupon.discount_percent,
    }


def apply_coupon_discount(subtotal_after_bogo: float, coupon_info: Optional[Dict]) -> float:
    """Calculate coupon discount amount on the BOGO-discounted subtotal."""
    if not coupon_info:
        return 0.0
    pct = coupon_info["discount_percent"]
    return round(subtotal_after_bogo * pct / 100.0, 2)
