import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Accès depuis les autres machines du LAN (ex: http://192.168.48.35:3000)
  // — sans cette liste, Next.js 16 bloque les assets en dev sur origine différente.
  allowedDevOrigins: ["192.168.48.35", "localhost"],
};

export default nextConfig;
