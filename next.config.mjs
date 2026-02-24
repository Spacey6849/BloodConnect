/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Temporary: allow production builds to succeed even if there are type errors
    ignoreBuildErrors: true
  },
  eslint: {
    // Skip ESLint during builds for now; keep it in CI/dev tasks if needed
    ignoreDuringBuilds: true
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  }
}

export default nextConfig
