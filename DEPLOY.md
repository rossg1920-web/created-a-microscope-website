# Deploy VividScope

Static site + Python server for **Clover Hosted Checkout**.

## Required environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOVER_MERCHANT_ID` | For live payments | From Clover Dashboard → Ecommerce API Tokens |
| `CLOVER_PRIVATE_TOKEN` | For live payments | Private token (Hosted checkout type) |
| `CLOVER_ENV` | Optional | `sandbox` (default) or `production` |
| `SITE_BASE_URL` | **Yes in production** | Public HTTPS URL of this site (no trailing slash) |
| `PORT` | Optional | Default `8080` (hosts often set this automatically) |

Without Clover credentials the app runs in **demo mode** (simulated checkout success page).

---

## Option 1: Render (recommended free tier)

1. Push this folder to a GitHub repo.
2. Go to [render.com](https://render.com) → **New** → **Web Service** (or use Blueprint with `render.yaml`).
3. Connect the repo.
4. Settings:
   - **Build:** `pip install -r requirements.txt`
   - **Start:** `python3 server.py`
   - **Health check path:** `/api/health`
5. Add env vars:
   - `SITE_BASE_URL` = `https://YOUR-SERVICE.onrender.com`
   - `CLOVER_MERCHANT_ID`, `CLOVER_PRIVATE_TOKEN`, `CLOVER_ENV`
6. Deploy.

Free tier may sleep after idle; first request can be slow.

---

## Option 2: Railway

1. [railway.app](https://railway.app) → **New Project** → deploy from GitHub.
2. Root directory = this folder (contains `server.py`).
3. Start command is read from `railway.json` / `Procfile`.
4. Variables → set `SITE_BASE_URL`, Clover keys.
5. Generate a domain under **Settings → Networking**.

---

## Option 3: Fly.io

```bash
# Install flyctl, then:
fly auth login
fly launch          # uses fly.toml + Dockerfile
fly secrets set CLOVER_MERCHANT_ID=... CLOVER_PRIVATE_TOKEN=... SITE_BASE_URL=https://vividscope.fly.dev
fly deploy
```

---

## Option 4: Docker (any VPS / cloud)

```bash
docker build -t vividscope .
docker run -p 8080:8080 \
  -e SITE_BASE_URL=https://your-domain.com \
  -e CLOVER_MERCHANT_ID=... \
  -e CLOVER_PRIVATE_TOKEN=... \
  -e CLOVER_ENV=sandbox \
  vividscope
```

Put Nginx or Caddy in front for HTTPS if needed.

---

## Clover Hosted Checkout setup

1. Clover Dashboard → **Settings → Ecommerce → Ecommerce API Tokens**.
2. Create token, integration type **Hosted checkout**.
3. Copy **Merchant ID** and **Private token** into env vars.
4. In Hosted Checkout page settings, set redirect URLs to match your site:
   - Success: `https://your-domain.com/success.html`
   - Failure / Cancel: `https://your-domain.com/cancel.html`
5. Optional: webhook URL for payment notifications.

Test cards (sandbox): see [Clover test cards](https://docs.clover.com/dev/docs/test-card-numbers).

---

## Local production-like test

```bash
cp .env.example .env
# edit .env
pip install -r requirements.txt
python3 server.py
# open http://localhost:8080
```
