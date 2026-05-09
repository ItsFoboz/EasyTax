/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The tax-engine workspace package ships TypeScript source via its `exports`
  // field; let Next.js transpile it directly so we don't need a build step.
  transpilePackages: ["@easytax/tax-engine", "@easytax/corporate-tax-engine"],
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
