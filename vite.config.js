import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 関数形式を用いて開発環境でプロキシを設定を構築
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || '';
  const stripPrefix = env.VITE_API_PROXY_STRIP_PREFIX ?? '/api';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // VITE_API_PROXY_TARGET が指定されていれば開発用プロキシを有効化
      proxy: proxyTarget
        ? {
            [stripPrefix || '/api'] : {
              target: proxyTarget,
              changeOrigin: true,
              // 任意でプレフィックスを削除（デフォルト: '/api'）、先頭の '/' を保証
              rewrite: (path) => {
                if (!stripPrefix) return path;
                const esc = stripPrefix.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
                const replaced = path.replace(new RegExp('^' + esc), '');
                return replaced === '' ? '/' : replaced;
              },
              // HTTPS 検証は有効のままにする（Cloudflare の証明書は有効）
              secure: true,
              // 任意: 応答が遅い上流サーバーに対してタイムアウトを延長
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq, req) => {
                  try {
                    // 開発ターミナルでデバッグ用にプロキシ先のパスをログ出力
                    const destPath = proxyReq.path || '';
                    console.log(`[proxy] ${req.method} ${req.url} -> ${proxyTarget}${destPath}`);
                  } catch (_) {}
                });
                proxy.on('proxyRes', (proxyRes, req) => {
                  try {
                    console.log(`[proxyRes] ${req.method} ${req.url} <- ${proxyRes.statusCode}`);
                  } catch (_) {  }
                });
              },
            },
          }
        : undefined,
    },
    optimizeDeps: {
      // 開発環境では重い Tauri プラグインの事前バンドルを避ける（遅延ロードされる）
      exclude: [
        '@tauri-apps/plugin-dialog',
        '@tauri-apps/plugin-fs',
        '@tauri-apps/plugin-http',
        '@tauri-apps/plugin-shell',
      ],
    },
  };
});
