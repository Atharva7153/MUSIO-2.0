FROM node:20-bookworm-slim

# 1. Install system dependencies for yt-dlp and audio transcoding (python3, ffmpeg, curl, ca-certificates)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      ffmpeg \
      curl \
      ca-certificates && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Install root Next.js dependencies
COPY package*.json ./
RUN npm install

# 3. Install YouTube backend dependencies
COPY MUSIO-2.0-yt-backend/package*.json ./MUSIO-2.0-yt-backend/
RUN cd MUSIO-2.0-yt-backend && npm install --omit=dev

# 4. Copy full project source (Next.js app + MUSIO-2.0-yt-backend)
COPY . .

# 5. Ensure latest yt-dlp binary is installed and executable
RUN mkdir -p /app/MUSIO-2.0-yt-backend/bin && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    cp /usr/local/bin/yt-dlp /app/MUSIO-2.0-yt-backend/bin/yt-dlp

# 6. Build the Next.js production application
ENV NODE_ENV=production
RUN npm run build

# Render / cloud providers inject PORT at runtime (default 3000)
# Next.js listens on $PORT and proxies /yt-api/* to MUSIO-2.0-yt-backend on internal port 4000
EXPOSE 3000

CMD ["npm", "start"]
