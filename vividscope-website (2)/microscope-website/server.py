#!/usr/bin/env python3
"""
VividScope – local server with Clover Hosted Checkout integration.

Uses only Python stdlib + requests (no Flask required).

Usage:
  1. Copy .env.example to .env and add Clover sandbox credentials (optional)
  2. python3 server.py
  3. Open http://localhost:8080

Without credentials the server runs in DEMO mode.
"""

from __future__ import annotations

import json
import os
import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

try:
    import requests
except ImportError:
    requests = None  # type: ignore

ROOT = Path(__file__).parent.resolve()
PORT = int(os.getenv("PORT", "8080"))

CLOVER_MERCHANT_ID = os.getenv("CLOVER_MERCHANT_ID", "").strip()
CLOVER_PRIVATE_TOKEN = os.getenv("CLOVER_PRIVATE_TOKEN", "").strip()
CLOVER_ENV = os.getenv("CLOVER_ENV", "sandbox").strip().lower()
SITE_BASE_URL = os.getenv("SITE_BASE_URL", f"http://localhost:{PORT}").rstrip("/")

if CLOVER_ENV == "production":
    CLOVER_API_BASE = "https://api.clover.com"
else:
    CLOVER_API_BASE = "https://apisandbox.dev.clover.com"

CHECKOUT_ENDPOINT = f"{CLOVER_API_BASE}/invoicingcheckoutservice/v1/checkouts"
DEMO_MODE = not (CLOVER_MERCHANT_ID and CLOVER_PRIVATE_TOKEN)


def build_line_items(items):
    line_items = []
    for item in items:
        name = str(item.get("name", "Item"))[:127]
        price_dollars = float(item.get("price", 0))
        qty = max(1, int(item.get("qty", 1)))
        price_cents = max(0, int(round(price_dollars * 100)))
        entry = {
            "name": name,
            "price": price_cents,
            "unitQty": qty,
        }
        note = str(item.get("category") or "").strip()
        if note:
            entry["note"] = note[:127]
        line_items.append(entry)
    return line_items


def json_response(handler, status: int, payload: dict):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.end_headers()
    handler.wfile.write(body)


def create_clover_checkout(items, customer):
    line_items = build_line_items(items)
    if not line_items:
        return 400, {"error": "No valid line items"}

    total_cents = sum(li["price"] * li["unitQty"] for li in line_items)

    customer_payload = {}
    if customer.get("email"):
        customer_payload["email"] = str(customer["email"])[:100]
    if customer.get("firstName"):
        customer_payload["firstName"] = str(customer["firstName"])[:40]
    if customer.get("lastName"):
        customer_payload["lastName"] = str(customer["lastName"])[:40]
    if customer.get("phoneNumber"):
        customer_payload["phoneNumber"] = str(customer["phoneNumber"])[:20]

    if DEMO_MODE:
        session_id = "demo-" + str(abs(hash(json.dumps(line_items, sort_keys=True))))[:12]
        return 200, {
            "demoMode": True,
            "checkoutSessionId": session_id,
            "href": f"{SITE_BASE_URL}/success.html?demo=1&session={session_id}&amount={total_cents}",
            "message": (
                "DEMO MODE: Set CLOVER_MERCHANT_ID and CLOVER_PRIVATE_TOKEN in .env "
                "to use real Clover Hosted Checkout."
            ),
            "totalCents": total_cents,
        }

    if requests is None:
        return 500, {"error": "requests library not installed. Run: pip install requests"}

    payload = {
        "customer": customer_payload if customer_payload else {"email": "customer@example.com"},
        "shoppingCart": {"lineItems": line_items},
        "redirectUrls": {
            "success": f"{SITE_BASE_URL}/success.html",
            "failure": f"{SITE_BASE_URL}/cancel.html?status=failure",
            "cancel": f"{SITE_BASE_URL}/cancel.html?status=cancel",
        },
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "X-Clover-Merchant-Id": CLOVER_MERCHANT_ID,
        "Authorization": f"Bearer {CLOVER_PRIVATE_TOKEN}",
        "User-Agent": "VividScope/1.0 (Clover Hosted Checkout)",
    }

    try:
        resp = requests.post(CHECKOUT_ENDPOINT, headers=headers, json=payload, timeout=30)
    except Exception as e:
        return 502, {"error": "Failed to reach Clover API", "detail": str(e)}

    if resp.status_code >= 400:
        try:
            err_body = resp.json()
        except Exception:
            err_body = {"raw": resp.text[:500]}
        return 502, {
            "error": "Clover checkout session failed",
            "status": resp.status_code,
            "detail": err_body,
        }

    result = resp.json()
    return 200, {
        "demoMode": False,
        "href": result.get("href"),
        "checkoutSessionId": result.get("checkoutSessionId"),
        "createdTime": result.get("createdTime"),
        "expirationTime": result.get("expirationTime"),
        "totalCents": total_cents,
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            return json_response(self, 200, {
                "ok": True,
                "demoMode": DEMO_MODE,
                "env": CLOVER_ENV,
                "apiBase": CLOVER_API_BASE,
            })

        if path == "/api/checkout-config":
            return json_response(self, 200, {
                "demoMode": DEMO_MODE,
                "environment": CLOVER_ENV,
                "configured": not DEMO_MODE,
            })

        # Default static file serving
        if path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/create-checkout":
            self.send_error(404, "Not Found")
            return

        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return json_response(self, 400, {"error": "Invalid JSON"})

        items = data.get("items") or []
        customer = data.get("customer") or {}
        if not items:
            return json_response(self, 400, {"error": "Cart is empty"})

        status, payload = create_clover_checkout(items, customer)
        return json_response(self, status, payload)

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {fmt % args}")


def main():
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("=" * 60)
    print("  VividScope + Clover Hosted Checkout")
    print("=" * 60)
    if DEMO_MODE:
        print("  MODE: DEMO (no Clover credentials found)")
        print("  → Copy .env.example to .env and add sandbox keys")
    else:
        print(f"  MODE: LIVE ({CLOVER_ENV})")
        print(f"  Merchant ID: {CLOVER_MERCHANT_ID[:8]}…")
        print(f"  API: {CLOVER_API_BASE}")
    print(f"  Open: http://localhost:{PORT}")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()


if __name__ == "__main__":
    main()
