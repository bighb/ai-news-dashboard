import { ProxyAgent, fetch as undiciFetch } from "undici";

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

export async function proxyFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  if (dispatcher) {
    return undiciFetch(url, {
      ...options,
      dispatcher,
    } as Parameters<typeof undiciFetch>[1]) as unknown as Response;
  }
  return fetch(url, options);
}
