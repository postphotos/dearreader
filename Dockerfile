# Use Node.js 20 slim image (Debian-based)
FROM node:20-slim

# Install necessary tools and libraries including Chromium
RUN apt-get update && apt-get install -y \
    libmagic-dev \
    build-essential \
    python3 \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV DISPLAY=:99
ENV DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY backend/functions/package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY backend/functions .

# Build the application
RUN npm run build

# Create local storage directory and set permissions
RUN mkdir -p /app/local-storage && chmod 777 /app/local-storage

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "build/server.js"]
