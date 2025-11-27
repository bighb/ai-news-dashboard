import { ProxyAgent, fetch as undiciFetch } from "undici";

// 从环境变量获取代理配置
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
// 创建代理调度器
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

/**
 * 支持代理的 fetch 请求
 * @param url 请求地址
 * @param options 请求配置
 * @returns 响应对象
 */
export async function proxyFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // 如果配置了代理,使用 undici 的 fetch
  if (dispatcher) {
    return undiciFetch(url, {
      ...options,
      dispatcher,
    } as Parameters<typeof undiciFetch>[1]) as unknown as Response;
  }
  // 否则使用标准 fetch
  return fetch(url, options);
}
