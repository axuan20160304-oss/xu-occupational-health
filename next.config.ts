import type { NextConfig } from "next";

const TUNNEL_URL = process.env.PDF_TUNNEL_URL || "http://localhost:8788";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/pdf-files/:path*",
        destination: `${TUNNEL_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
