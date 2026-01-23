/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: ['he', 'en'],
    defaultLocale: 'he',
    localeDetection: false
  },
  // External packages for server components
  serverComponentsExternalPackages: ['pdfjs-dist'],
  // Path alias support
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

    // Fix for pdfjs-dist with Next.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Handle pdfjs-dist module resolution - more aggressive fix
    if (!isServer) {
      // Ignore canvas in browser
      config.resolve.alias.canvas = false;
      
      // Fix for pdfjs-dist bundling issue - exclude from optimization
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          pdfjs: {
            test: /[\\/]node_modules[\\/](pdfjs-dist|react-pdf)[\\/]/,
            name: 'pdfjs',
            chunks: 'all',
            enforce: true
          }
        }
      };
    }

    return config;
  },
};

module.exports = nextConfig;

