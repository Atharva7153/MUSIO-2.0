/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    proxyTimeout: 300000, // 5 minutes timeout for YouTube downloads & transcoding
  },
  async rewrites() {
    return [
      {
        source: "/yt-api/:path*",
        destination: "http://127.0.0.1:4000/:path*",
      },
    ];
  },
};

export default nextConfig;
