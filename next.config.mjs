/** @type {import('next').NextConfig} */
const nextConfig = {
  // node:sqlite adalah native module; biarkan tetap external di server bundle.
  experimental: {
    serverComponentsExternalPackages: ['node:sqlite'],
  },
};

export default nextConfig;
