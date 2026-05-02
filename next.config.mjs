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
};

export default nextConfig;
