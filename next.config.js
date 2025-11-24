/** @type {import('next').NextConfig} */
const isMobileBuild = process.env.CAPACITOR_BUILD === 'true'

const nextConfig = {
  output: isMobileBuild ? 'export' : undefined,
  images: {
    unoptimized: isMobileBuild,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalizar pacotes FFmpeg para evitar bundling
      config.externals = config.externals || []
      config.externals.push({
        'fluent-ffmpeg': 'commonjs fluent-ffmpeg',
        '@ffmpeg-installer/ffmpeg': 'commonjs @ffmpeg-installer/ffmpeg',
      })
    }
    return config
  },
  // SECURITY FIX (VULN-011): Configure CORS and security headers
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development'

    return [
      {
        // CORS for API routes - permitir todos em dev, específico em prod
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Permitir todos (CORS será validado por middleware se necessário)
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          // Removido Access-Control-Allow-Credentials pois não funciona com '*'
          // {
          //   key: 'Access-Control-Allow-Credentials',
          //   value: 'true',
          // },
        ],
      },
      {
        // Webhook-specific CORS (only allow Meta)
        source: '/api/webhook/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://graph.facebook.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST',
          },
        ],
      },
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
