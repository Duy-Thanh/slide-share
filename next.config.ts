import type { NextConfig } from "next";
const WebpackObfuscator = require('webpack-obfuscator');

const nextConfig: NextConfig = {
  /* config options here */
  productionBrowserSourceMaps: false,
  webpack: (config, { dev, isServer }) => {
    // Chỉ làm rối code ở môi trường Production và phía Client (Browser)
    if (!dev && !isServer) {
      config.plugins.push(
        new WebpackObfuscator(
          {
            log: false,
            rotateStringArray: true,
            stringArray: true,
            stringArrayThreshold: 0.75, // Mã hóa 75% các chuỗi
            deadCodeInjection: false,   // Tránh làm tăng size file quá nhiều
            compact: true,
            controlFlowFlattening: false, // Bật true nếu muốn xáo trộn logic mạnh hơn (sẽ tốn PWA/CPU hơn)
          },
          ['framework-*.js', 'main-*.js', 'webpack-*.js', '_app-*.js']
        )
      );
    }
    return config;
  },
};

export default nextConfig;
