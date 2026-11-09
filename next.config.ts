import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        // 只要前端请求 /api 开头的路径
        source: '/api/:path*',
        // Vercel 服务器就偷偷帮你转发到你的阿里云后端
        destination: 'http://8.134.138.0:4000/api/:path*',
      },
    ];
  },
};

export default nextConfig;