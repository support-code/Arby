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
        canvas: false,
      };
      
      // Ignore canvas in browser
      config.resolve.alias.canvas = false;
      
      // Exclude pdfjs-dist from bundling to avoid webpack issues
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('pdfjs-dist');
      } else {
        config.externals = [config.externals, 'pdfjs-dist'];
      }
    }

    return config;
  },
};

module.exports = nextConfig;

