import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        ignored: ["**/visitors.db", "**/*.db", "**/*.db-journal", "**/*.db-wal"],
      }
    }
    return config;
  },
};

export default nextConfig;
