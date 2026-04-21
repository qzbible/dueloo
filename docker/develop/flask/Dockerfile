FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for packages like cryptography, bcrypt, grpcio, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Fix: requirements.txt is in the backend/ directory in the context
COPY backend/requirements.txt .

RUN pip install --upgrade pip \
    && pip install --no-cache-dir --timeout=120 -r requirements.txt

# Copy the rest of the backend code
COPY backend/ .

# Copy entrypoint and start scripts from their relative paths in the context
COPY ./docker/develop/flask/entrypoint /entrypoint
RUN sed -i 's/\r$//g' /entrypoint && chmod +x /entrypoint

COPY ./docker/develop/flask/start /start
RUN sed -i 's/\r$//g' /start && chmod +x /start

ENTRYPOINT ["/entrypoint"]