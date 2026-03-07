/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/rebuild/admin", destination: "/v2/admin", permanent: false },
      { source: "/rebuild/financeiro", destination: "/v2/financeiro", permanent: false },
      { source: "/rebuild/operator", destination: "/v3/operator", permanent: false },
    ];
  },
};

export default nextConfig;
