/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['bcrypt']
  },
  webpack: (config: any) => {
    // Ignore node-specific modules in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true, // ✅ This line disables ESLint during `next build`
  },
};

export default nextConfig;
