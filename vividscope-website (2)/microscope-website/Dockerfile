# VividScope – production image
FROM python:3.12-slim

WORKDIR /app

# System deps (optional, keeps image lean)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default port (override with PORT env on hosts like Render)
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

# Health check for orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:'+__import__('os').environ.get('PORT','8080')+'/api/health')" || exit 1

CMD ["python3", "server.py"]
