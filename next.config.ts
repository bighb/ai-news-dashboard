import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://10.3.74.68:3000",
  ],
};

export default nextConfig;
