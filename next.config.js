/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['bcryptjs'],
  webpack: (config, { isServer }) => {
    // Only run this on the client side
    if (!isServer) {
      // Ignore node-specific modules in the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        buffer: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
      };
      
      // Ignore problematic packages
      config.externals = [
        ...(config.externals || []),
        {'bcrypt': 'bcrypt'},
        {'@mapbox/node-pre-gyp': '@mapbox/node-pre-gyp'},
        'node-gyp',
        'npm',
      ];
    }
    
    return config;
  },
};

module.exports = nextConfig; 