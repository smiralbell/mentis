/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Incluir el engine de Prisma en standalone (necesario en Docker/Alpine)
  experimental: {
    outputFileTracingIncludes: {
      '/**': [
        './node_modules/.prisma/client/*',
        './node_modules/@prisma/engines/**/*',
      ],
    },
  },
}

module.exports = nextConfig


