import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript 에러는 무시 (이건 여전히 유효함)
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint 부분은 지워주세요! (Next.js 15부터는 여기서 설정 안 해도 됨)
};

export default nextConfig;
