import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Плавающий индикатор dev-инструментов мешает нижней навигации — выключаем
  devIndicators: false,
};

export default nextConfig;
