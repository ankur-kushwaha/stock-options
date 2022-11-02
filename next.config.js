/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async redirects() {
    return [
      {
        source: '/login',
        destination: `https://kite.zerodha.com/connect/login?v=3&api_key=ab8oz67ryftv7gx9&redirect_params=env%3D${process.env.NODE_ENV}`,
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
