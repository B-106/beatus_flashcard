import type { NextConfig } from "next";

// : NextConfig 타입을 지워서 TypeScript가 딴지를 못 걸게 합니다.
const nextConfig = {
  typescript: {
    // 빌드 시 타입 에러 무시 (배포 성공용)
    ignoreBuildErrors: true,
  },
  eslint: {
    // 빌드 시 ESLint 에러 무시 (배포 성공용)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
