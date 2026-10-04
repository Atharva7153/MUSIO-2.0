FROM node:20-bookworm-slim

# Install python3, ffmpeg, curl, and ca-certificates required by yt-dlp & audio transcoding
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      ffmpeg \
      curl \
      ca-certificates && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install YouTube backend dependencies
COPY MUSIO-2.0-yt-backend/package*.json ./
RUN npm install --omit=dev

# Copy YouTube backend source
COPY MUSIO-2.0-yt-backend/ ./

# Download latest yt-dlp binary into /usr/local/bin/yt-dlp and /app/bin/yt-dlp
RUN mkdir -p /app/bin && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    cp /usr/local/bin/yt-dlp /app/bin/yt-dlp

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "index.js"]
