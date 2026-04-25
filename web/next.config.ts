import type { NextConfig } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Proxy /api/* to the FastAPI backend in dev so EventSource and fetch are
  // same-origin (no CORS) and the same code works in prod when the backend
  // is mounted under /api/ on the same host.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE}/:path*`,
      },
    ];
  },
};

export default nextConfig;
