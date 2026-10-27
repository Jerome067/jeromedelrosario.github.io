// JCover is exported as static files and served from the portfolio's /jcover/ folder.
// BASE_PATH must match where the site is hosted (see README.md).
const basePath = process.env.BASE_PATH ?? "/jeromedelrosario.github.io/jcover";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
export default nextConfig;
