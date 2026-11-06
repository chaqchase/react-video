/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Pages read their content at build time, but search reads it on each request.
  outputFileTracingIncludes: { "/api/search": ["./content/docs/**/*"] },
  async redirects() {
    return [{ source: "/docs", destination: "/docs/v4", permanent: false }];
  },
};

export default config;
