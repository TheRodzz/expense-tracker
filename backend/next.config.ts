import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Or your other existing configurations
  async headers() {
    return [
      {
        // Matching all API routes
        source: "/api/:path*", // Adjust if your API routes have a different base path
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          // Allow requests from the specific Vercel frontend URL
          { key: "Access-Control-Allow-Origin", value: "https://expense-tracker-frontend-phi-nine.vercel.app" }, 
          // Allowed methods for CORS preflight
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          // Allowed headers for CORS preflight
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
          // Added standard 'Allow' header
          { key: "Allow", value: "OPTIONS, POST, GET, PATCH, DELETE, PUT" },
           // Added 'Vary' header - Note: Vary: Origin is less effective with Allow-Origin: *
          { key: "Vary", value: "Origin, Access-Control-Request-Method, Access-Control-Request-Headers, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch" },
        ],
      },
      // You might want to add more specific rules or general rules for non-API paths
    ];
  },
};

module.exports = nextConfig;

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;
