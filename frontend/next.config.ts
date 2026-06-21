import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // API traffic is proxied at runtime by src/app/api/[...path]/route.ts (supports POST/multipart).
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "*.ts.net" },
      { protocol: "https", hostname: "*.onrender.com" },
      { protocol: "https", hostname: "*.railway.app" },
    ],
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
};

export default nextConfig;
