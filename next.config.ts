import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "square"],
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt", "*.lhr.life"],
};

export default nextConfig;
