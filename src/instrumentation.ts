/**
 * Next.js Instrumentation Hook
 *
 * 该文件用于在 Next.js 应用启动时执行初始化操作
 * 文档：https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * 主要功能：
 * - 配置全局 HTTP/HTTPS 代理（仅开发环境）
 * - 解决开发环境的网络访问限制问题（如防火墙、公司代理等）
 */

export async function register() {
  // 仅在 Node.js 运行时环境执行（排除 Edge Runtime）
  if (process.env.NEXT_RUNTIME === "nodejs") {
    /**
     * 全局代理配置
     *
     * 用途：解决开发环境的网络访问问题
     * - 开发环境：需要通过代理访问外部 API（HackerNews、Reddit、arXiv 等）
     * - 生产环境（Vercel）：直接访问，无需代理
     *
     * 工作原理：
     * 1. global-agent 会修改 Node.js 原生的 http/https 模块
     * 2. 拦截所有 HTTP/HTTPS 请求并自动添加代理配置
     * 3. 对于使用 undici 的请求，项目中的 proxyFetch 已单独处理
     *
     * 注意：
     * - 本项目同时使用了 global-agent（全局代理）和 undici ProxyAgent（显式代理）
     * - global-agent 用于捕获任何可能的原生 http/https 请求
     * - 主要的 API 请求通过 src/lib/proxy-fetch.ts 使用 undici 处理
     */

    // 仅在非生产环境启用代理（开发环境、预览环境等）
    // 生产环境（Vercel）不需要代理，直接访问外部 API
    const isProduction =
      process.env.NODE_ENV === "production" && process.env.VERCEL === "1";

    if (!isProduction) {
      // 将标准的代理环境变量映射为 global-agent 格式
      // 标准格式：HTTP_PROXY, HTTPS_PROXY
      // global-agent 格式：GLOBAL_AGENT_HTTP_PROXY, GLOBAL_AGENT_HTTPS_PROXY
      if (process.env.HTTP_PROXY || process.env.http_proxy) {
        process.env.GLOBAL_AGENT_HTTP_PROXY =
          process.env.HTTP_PROXY || process.env.http_proxy;
      }
      if (process.env.HTTPS_PROXY || process.env.https_proxy) {
        process.env.GLOBAL_AGENT_HTTPS_PROXY =
          process.env.HTTPS_PROXY || process.env.https_proxy;
      }

      // 仅在配置了代理环境变量时才启动 global-agent
      if (
        process.env.GLOBAL_AGENT_HTTP_PROXY ||
        process.env.GLOBAL_AGENT_HTTPS_PROXY
      ) {
        const { bootstrap } = await import("global-agent");
        bootstrap();

        console.log("[Instrumentation] 全局代理已启用:");
        if (process.env.GLOBAL_AGENT_HTTP_PROXY) {
          console.log(`  HTTP_PROXY: ${process.env.GLOBAL_AGENT_HTTP_PROXY}`);
        }
        if (process.env.GLOBAL_AGENT_HTTPS_PROXY) {
          console.log(`  HTTPS_PROXY: ${process.env.GLOBAL_AGENT_HTTPS_PROXY}`);
        }
      } else {
        console.log(
          "[Instrumentation] 未检测到代理配置，跳过 global-agent 初始化"
        );
      }
    } else {
      console.log("[Instrumentation] 生产环境，跳过代理配置");
    }
  }
}
