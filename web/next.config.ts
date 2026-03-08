import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external images from job board APIs
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
