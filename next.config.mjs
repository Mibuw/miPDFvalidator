/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle (.next/standalone) for a slim Docker image.
  output: "standalone",
  // @react-pdf/renderer relies on Node core modules; keep it server-external
  // so it is not bundled for the browser and runs on the Node.js runtime.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // Allow larger document uploads to the route handlers (base64 blows up size).
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
