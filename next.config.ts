import type { NextConfig } from "next";

const TUNNEL_URL = process.env.PDF_TUNNEL_URL || "https://5744a7de.r11.vip.cpolar.cn";

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
