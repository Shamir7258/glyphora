import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean production image for the Dockerfile — bundles only the files a `next
  // start` server actually needs into .next/standalone.
  output: "standalone",
  images: {
    // Preview images/specimens live in object storage (AWS S3 or Cloudflare R2) —
    // add the deployed bucket/CDN hostname(s) here. Wildcard subdomain covers R2's
    // <accountid>.r2.dev pattern and S3's regional virtual-hosted URLs.
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "images.unsplash.com" }, // placeholder mockup imagery only
    ],
    qualities: [50, 75, 90],
  },
};

export default nextConfig;
