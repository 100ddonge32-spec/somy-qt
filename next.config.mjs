/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    async rewrites() {
        return [
            {
                source: '/:church_id',
                destination: '/?church_id=:church_id',
            },
        ];
    },
};

export default nextConfig;
