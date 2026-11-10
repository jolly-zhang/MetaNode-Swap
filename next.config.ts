import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // 只要前端请求 /api 开头的路径
        source: '/api/:path*',
        // Vercel 服务器就偷偷帮你转发到你的阿里云后端
        destination: 'https://swap-backend-qbl0.onrender.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;