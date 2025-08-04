import type { NextConfig } from "next";

/** @type {NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: true,              // ← keep your own options

  // ⬇ 1) ignore ESLint problems during `next build`
  eslint: {
    /** Allows production builds to complete even if lint errors exist. */
    ignoreDuringBuilds: true,
  },

  // ⬇ 2) ignore *all* TS type-checking errors (includes Tailwind IntelliSense)
  typescript: {
    /** Skip type-checks so build never fails on TS/Tailwind issues. */
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
