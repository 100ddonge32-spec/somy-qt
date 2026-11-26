/** @type {import('next').NextConfig} */
const nextConfig = {
    // Capacitor(앱) 빌드를 위한 정적 추출 모드는 CAPACITOR_BUILD=1 환경변수가 있을 때만 활성화합니다.
    output: process.env.CAPACITOR_BUILD ? 'export' : undefined,
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        unoptimized: true,
    },
    ...(!process.env.CAPACITOR_BUILD
        ? {
              async rewrites() {
                  return [
                      { source: '/chapel', destination: '/online-chapel.html' },
                      { source: '/%EC%98%88%EB%B0%B0%EB%8B%B9', destination: '/online-chapel.html' },
                      { source: '/예배당', destination: '/online-chapel.html' },
                  ];
              },
          }
        : {}),
};

export default nextConfig;
