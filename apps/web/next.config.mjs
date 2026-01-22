import mdx from '@next/mdx';

const withMDX = mdx({
  extension: /\.mdx?$/,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'mdx'],
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      worker_threads: false,
      fs: false,
      os: false,
      path: false,
    };

    // Add raw-loader specifically for sample files only (not all JSON/CSV/XML files)
    config.module.rules.push({
      test: /\.(csv|json|xml|ndjson)$/,
      include: /public[\\/]samples/,
      use: 'raw-loader',
    });

    return config;
  },
};

export default withMDX(nextConfig);
