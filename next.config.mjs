/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for the production Docker image (see Dockerfile).
  output: "standalone",
};

export default nextConfig;
