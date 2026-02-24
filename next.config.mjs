/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow cross-origin requests from tunnel services
  async headers() {
    return [
      {
        source: "/api/camera-session/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
  // Required so the camera page can be rendered when accessed via tunnel
  allowedDevOrigins: ["*"],
};

export default nextConfig;
