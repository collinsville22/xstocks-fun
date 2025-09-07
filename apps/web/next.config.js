/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@xstocks/ui',
    '@xstocks/hooks', 
    '@xstocks/stores',
    '@xstocks/types',
    '@xstocks/config'
  ],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  experimental: {
    optimizePackageImports: ['@xstocks/ui'],
  }
};

module.exports = nextConfig;