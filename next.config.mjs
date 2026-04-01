/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ignora erros de tipagem no build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignora erros de linting no build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
