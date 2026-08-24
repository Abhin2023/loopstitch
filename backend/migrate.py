"""
Idempotent schema migration for Loopstitch.

`Base.metadata.create_all()` creates NEW tables but never alters EXISTING ones.
This script:
  1. Creates any missing tables (settings, offers, ...)
  2. Adds missing columns to existing tables (orders, order_items)
  3. Seeds default store settings on first run

Safe to run multiple times — every step checks before acting.

Run once after each deploy that changes the schema:

    python migrate.py

(or inside Docker:  docker exec -it loopstitch-app-1 python migrate.py)
"""
import sqlalchemy as sa
from app.database import engine, SessionLocal, Base
from app import models


def get_columns(conn: sa.engine.Connection, table: str) -> set:
    insp = sa.inspect(conn)
    if table not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def add_column(conn: sa.engine.Connection, table: str, column: sa.Column) -> None:
    col_type = column.type.compile(dialect=engine.dialect)
    default = ""
    if column.server_default is not None and isinstance(column.server_default.arg, str):
        default = f" DEFAULT '{column.server_default.arg}'"
    elif column.nullable is False:
        # backfill existing rows so NOT NULL succeeds
        if str(col_type).startswith("FLOAT"):
            default = " DEFAULT 0"
        else:
            default = " DEFAULT ''"
    conn.execute(sa.text(f"ALTER TABLE {table} ADD COLUMN {column.name} {col_type}{default}"))
    print(f"  + {table}.{column.name} ({col_type})")


def ensure_columns() -> None:
    wanted = {
        "orders": [
            models.Order.discount_amount,
            models.Order.offer_id,
            models.Order.offer_label,
            models.Order.coupon_id,
            models.Order.coupon_code,
            models.Order.coupon_discount,
        ],
        "order_items": [
            models.OrderItem.line_discount,
        ],
    }
    with engine.begin() as conn:
        for table, columns in wanted.items():
            existing = get_columns(conn, table)
            if not existing:
                print(f"  ! table '{table}' does not exist yet — create_all will handle it")
                continue
            for column in columns:
                if column.name not in existing:
                    add_column(conn, table, column)


def seed_settings() -> None:
    defaults = {
        "delivery_fee": "45",
        "free_shipping_threshold": "1000",
    }
    db = SessionLocal()
    try:
        changed = False
        for key, value in defaults.items():
            row = db.query(models.Setting).filter(models.Setting.key == key).first()
            if not row:
                db.add(models.Setting(key=key, value=value))
                print(f"  + setting '{key}' = {value}")
                changed = True
        if changed:
            db.commit()
    finally:
        db.close()


def main() -> None:
    print("Loopstitch migration")
    print("1/3 creating missing tables...")
    Base.metadata.create_all(bind=engine)
    print("2/3 adding missing columns...")
    ensure_columns()
    print("3/3 seeding default settings...")
    seed_settings()
    print("Done.")


if __name__ == "__main__":
    main()
