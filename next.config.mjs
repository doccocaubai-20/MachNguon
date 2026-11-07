/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
