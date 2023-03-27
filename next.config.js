/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async redirects() {
    return [
      {
        source: '/login',
        destination: `https://smartapi.angelbroking.com/publisher-login?api_key=${process.env.SMARTAPI_KEY}`,
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
