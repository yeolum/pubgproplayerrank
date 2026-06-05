/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.pubg.com",
      },
    ],
  },
};

export default nextConfig;
