/** @type {import('next').NextConfig} */
const nextConfig = {
    output: process.env.VERCEL ? undefined : 'export',
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
