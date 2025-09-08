# Unified Dockerfile supporting both development (slim) and production (alpine)
# - Dev targets (js-dev, python-dev) use Debian-slim images with dev tooling
# - Prod target (js-prod) uses a slim Alpine image optimized for runtime

########################################
# JS Development (slim) - used by js-dev/js-test
########################################
FROM node:20-slim AS js-base-slim
WORKDIR /app
# Install Chromium for Puppeteer (dev image)
RUN apt-get update && apt-get install -y chromium --no-install-recommends && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

FROM js-base-slim AS js-deps
WORKDIR /app
COPY js/package.json js/package-lock.json* ./
# Install production and dev dependencies so TypeScript and dev tools are available
RUN npm install --include=dev

FROM js-deps AS js-dev
WORKDIR /app
COPY js/ ./js/
WORKDIR /app/js


########################################
# Python Dev (shared) - used by python-dev
########################################
FROM python:3.9-slim AS python-base
WORKDIR /app
COPY py/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python-base AS python-dev
WORKDIR /app
COPY py/ ./py/
ENV PYTHONPATH=/app


########################################
# JS Production (alpine) - used by js-prod (server) image
########################################
FROM node:20-alpine AS js-base-alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
WORKDIR /app

FROM js-base-alpine AS js-deps-prod
WORKDIR /app
COPY js/package*.json ./
RUN npm ci --only=production

FROM js-deps-prod AS js-prod
WORKDIR /app
COPY js/ .
# Build the application and prepare runtime storage
RUN npm run build
RUN mkdir -p /app/local-storage && chmod 777 /app/local-storage
EXPOSE 8080
CMD ["npm", "start"]
# Use Alpine Linux for lightweight container
FROM node:20-alpine

# Install Chromium and minimum required dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set environment variables for Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY js/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY js/ .

# Build the application
RUN npm run build

# Create local storage directory and set permissions
RUN mkdir -p /app/local-storage && chmod 777 /app/local-storage

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
