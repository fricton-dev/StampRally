import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv, type ServerOptions } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // ← これが超重要。Viteの .env をここで読み込む
  const env = loadEnv(mode, process.cwd(), ""); // "VITE_" 以外も読みたいので3つ目は空文字

  const useSecureHmr = env.VITE_SECURE_HMR === "true";
  const hmrHost = env.VITE_HMR_HOST ?? "localhost";
  const hmrPort = Number(env.VITE_HMR_PORT ?? 5173);
  const httpsFlag = env.VITE_DEV_HTTPS === "true";

  // 実行場所がどこでも動くように、証明書は絶対パスへ解決
  const certFile = env.VITE_DEV_CERT_PATH
    ? path.resolve(process.cwd(), env.VITE_DEV_CERT_PATH)
    : undefined;
  const keyFile = env.VITE_DEV_KEY_PATH
    ? path.resolve(process.cwd(), env.VITE_DEV_KEY_PATH)
    : undefined;

const resolveHttpsOptions = (): ServerOptions["https"] | undefined => {
    if (!httpsFlag) return undefined;
    if (!certFile || !keyFile || !fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
      console.warn(
        `[vite] HTTPS is enabled but certificate files were not found.\n` +
          `  - VITE_DEV_CERT_PATH=${certFile}\n` +
          `  - VITE_DEV_KEY_PATH=${keyFile}\n` +
          `Current dir: ${process.cwd()}`
      );
      return undefined;
    }
    return {
      cert: fs.readFileSync(certFile),
      key: fs.readFileSync(keyFile),
    };
  };

  const httpsOptions = resolveHttpsOptions();

  return {
    plugins: [tailwindcss(), react()],
    server: {
      host: true,
      https: httpsOptions, // ここが undefined だと HTTP のまま
      allowedHosts: ["localhost", "127.0.0.1", "[::1]", "192.168.0.69"],
      hmr: useSecureHmr
        ? { protocol: "wss", host: hmrHost, port: hmrPort }
        : { protocol: "ws", host: hmrHost, port: hmrPort },

      proxy: {
    "/api": {
      target: process.env.VITE_API_TARGET, // http://192.168.0.69:8000
      changeOrigin: true,
      secure: false,         // httpターゲットでもOKにする
      // 必要ならパスを書き換え（例：/api -> /api はそのままなので不要）
      // rewrite: (p) => p.replace(/^\/api/, "/api"),
    },
  },
    },
  };
});
