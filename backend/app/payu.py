"""
PayU Hosted Checkout helpers — hash generation, reverse-hash verification,
and verify-payment fallback API.

Docs: https://docs.payu.in/docs/generate-hash-merchant-hosted
"""
from __future__ import annotations

import hashlib
from typing import Dict, Optional

import httpx

PAYU_TEST_PAYMENT_URL = "https://test.payu.in/_payment"
PAYU_PROD_PAYMENT_URL = "https://secure.payu.in/_payment"
PAYU_TEST_VERIFY_URL = "https://test.payu.in/merchant/postservice.php?form=2"
PAYU_PROD_VERIFY_URL = "https://info.payu.in/merchant/postservice.php?form=2"


def payment_url(is_test: bool = True) -> str:
    return PAYU_TEST_PAYMENT_URL if is_test else PAYU_PROD_PAYMENT_URL


def generate_hash(
    key: str,
    salt: str,
    txnid: str,
    amount: str,
    productinfo: str,
    firstname: str,
    email: str,
    udf1: str = "",
    udf2: str = "",
    udf3: str = "",
    udf4: str = "",
    udf5: str = "",
) -> str:
    """
    Request hash for the _payment endpoint.

    sha512(key|txnid|amount|productinfo|firstname|email|
            udf1|udf2|udf3|udf4|udf5||||||SALT)
    """
    hash_str = (
        f"{key}|{txnid}|{amount}|{productinfo}|{firstname}|{email}"
        f"|{udf1}|{udf2}|{udf3}|{udf4}|{udf5}||||||{salt}"
    )
    return hashlib.sha512(hash_str.encode("utf-8")).hexdigest()


def verify_response_hash(salt: str, params: Dict[str, str]) -> str:
    """
    Reverse-hash verification of a PayU response / webhook payload.

    sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|
            firstname|productinfo|amount|txnid|key)
    """
    hash_str = (
        f"{salt}"
        f"|{params.get('status', '')}"
        f"||||||"
        f"{params.get('udf5', '')}"
        f"|{params.get('udf4', '')}"
        f"|{params.get('udf3', '')}"
        f"|{params.get('udf2', '')}"
        f"|{params.get('udf1', '')}"
        f"|{params.get('email', '')}"
        f"|{params.get('firstname', '')}"
        f"|{params.get('productinfo', '')}"
        f"|{params.get('amount', '')}"
        f"|{params.get('txnid', '')}"
        f"|{params.get('key', '')}"
    )
    return hashlib.sha512(hash_str.encode("utf-8")).hexdigest()


def verify_hash_valid(salt: str, params: Dict[str, str]) -> bool:
    """Return True if the response hash matches the expected value."""
    expected = params.get("hash", "")
    if not expected:
        return False
    return verify_response_hash(salt, params) == expected.lower().strip()


def verify_payment_api(
    key: str,
    salt: str,
    txnid: str,
    is_test: bool = True,
) -> Optional[Dict]:
    """
    Call PayU verify_payment API as a fallback when the webhook is missed.

    Returns the parsed JSON response dict, or None on error.
    Hash: sha512(key|verify_payment|txnid|SALT)
    """
    hash_str = f"{key}|verify_payment|{txnid}|{salt}"
    hash_val = hashlib.sha512(hash_str.encode("utf-8")).hexdigest()
    url = PAYU_TEST_VERIFY_URL if is_test else PAYU_PROD_VERIFY_URL
    try:
        resp = httpx.post(
            url,
            data={
                "key": key,
                "command": "verify_payment",
                "var1": txnid,
                "hash": hash_val,
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return None
