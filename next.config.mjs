/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Squarespace-hosted headshots (column Q)
      { protocol: 'https', hostname: '**.squarespace-cdn.com' },
      { protocol: 'https', hostname: '**.squarespace.com' },
      // add further hosts here if headshots ever move
    ],
  },
};
export default nextConfig;
