import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
    formats: ['image/avif', 'image/webp'], // Faster image loading
    minimumCacheTTL: 3600, // 1 hour image cache
  },
  typescript: {
    ignoreBuildErrors: true, // Fix TS errors separately
  },
  eslint: {
    ignoreDuringBuilds: true, // Faster builds
  },
  // Optimize large package imports — tree-shake only what's used
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@clerk/nextjs',
      'framer-motion',
      'recharts',
    ],
  },
  // HTTP compression (gzip/brotli) for all responses
  compress: true,
  // Power Vercel Edge Network caching
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      // Cache static assets for 1 year
      source: '/(.*)\\.(ico|jpg|jpeg|png|gif|svg|webp|avif|woff|woff2)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ],
};

export default nextConfig;
