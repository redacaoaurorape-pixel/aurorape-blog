import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      // O backend aceita upload de imagem até 8MB (ver ALLOWED_UPLOAD_CONTENT_TYPES em
      // backend/app/routers/api/admin.py); a Server Action de upload precisa de um limite
      // de corpo maior que o padrão de 1MB para não rejeitar o arquivo antes do backend validar.
      bodySizeLimit: "9mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
