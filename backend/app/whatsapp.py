"""
WhatsApp Business Cloud API helpers (Meta Cloud API v23.0).

Sends pre-approved template messages for order confirmations.
"""
import os
import logging
from typing import Dict, Any, List, Optional

import httpx

logger = logging.getLogger(__name__)

PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v23.0")

BASE_URL = f"https://graph.facebook.com/{API_VERSION}"


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }


def is_configured() -> bool:
    return bool(PHONE_NUMBER_ID and ACCESS_TOKEN)


def send_template_message(
    phone: str,
    template_name: str,
    language_code: str,
    body_params: List[str],
) -> Dict[str, Any]:
    """
    Send a pre-approved WhatsApp template message.

    Args:
        phone: Recipient phone in E.164 format (e.g. "+916238860673")
        template_name: Name of the approved Meta template (e.g. "order_confirm")
        language_code: BCP-47 language code (e.g. "en", "en_US")
        body_params: Ordered list of template body variables

    Returns:
        Dict with "message_id" (wamid.xxx) on success.

    Raises:
        Exception on API failure.
    """
    if not is_configured():
        raise RuntimeError("WhatsApp is not configured — missing PHONE_NUMBER_ID or ACCESS_TOKEN")

    url = f"{BASE_URL}/{PHONE_NUMBER_ID}/messages"

    parameters: List[Dict[str, str]] = [
        {"type": "text", "text": param} for param in body_params
    ]

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {
                "policy": "deterministic",
                "code": language_code,
            },
            "components": [
                {
                    "type": "body",
                    "parameters": parameters,
                }
            ],
        },
    }

    with httpx.Client(timeout=15.0) as client:
        resp = client.post(url, json=payload, headers=_headers())
        data = resp.json()

    if resp.status_code not in (200, 201):
        error_msg = data.get("error", {}).get("message", resp.text)
        raise RuntimeError(f"WhatsApp API error ({resp.status_code}): {error_msg}")

    messages = data.get("messages", [])
    if not messages:
        raise RuntimeError("WhatsApp API returned no messages in response")

    return {"message_id": messages[0].get("id", "")}


def build_order_confirm_params(
    customer_name: str,
    order_number: str,
    items_summary: str,
    total: str,
    payment_method: str,
) -> List[str]:
    """
    Build the ordered body parameter list for the order_confirm template.

    Template variables:
      {{1}} = customer first name
      {{2}} = order number
      {{3}} = items summary (e.g. "2 items — Ronin Wave Tee × 1, Elite Soldier Tee × 1")
      {{4}} = total amount (e.g. "₹999")
      {{5}} = payment method (e.g. "Online (Razorpay)" or "COD — 10% paid")
    """
    first_name = customer_name.strip().split()[0] if customer_name.strip() else "there"
    return [
        first_name,
        order_number,
        items_summary,
        total,
        payment_method,
    ]
