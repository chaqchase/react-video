/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/docs", destination: "/docs/v4", permanent: false }];
  },
};

export default config;
