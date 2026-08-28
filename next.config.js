/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      'api/**/*': ['./data/**/*'],
      'app/**/*': ['./data/**/*'],
      '/*': ['./data/**/*'],
    },
  },
};

module.exports = nextConfig;
