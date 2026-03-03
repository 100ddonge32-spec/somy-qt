/** @type {import('next').NextConfig} */
const nextConfig = {
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
