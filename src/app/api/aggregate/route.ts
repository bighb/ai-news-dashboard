import { NextResponse } from "next/server";
import { fetchRedditPosts } from "@/lib/data-sources/reddit";
import { fetchHNStories } from "@/lib/data-sources/hackernews";
import { fetchArxivPapers } from "@/lib/data-sources/arxiv";
import { AggregateResponse, NewsItem } from "@/types";

/**
 * Next.js 16 路由段配置
 * 文档：https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
 */

/**
 * 动态渲染模式配置
 *
 * 设置为 'force-dynamic' 强制此路由始终动态渲染，原因：
 * 1. 该 API 需要获取实时的外部数据（Reddit、Hacker News、arXiv）
 * 2. 数据源使用了 cache: 'no-store' 的 fetch 请求，表示数据不应被缓存
 * 3. Next.js 16 默认会尝试静态渲染所有路由，但动态数据获取会导致构建失败
 * 4. 'force-dynamic' 告诉 Next.js：这是一个动态 API，每次请求都重新执行
 *
 * 可选值：
 * - 'auto'（默认）：自动判断是否需要动态渲染
 * - 'force-dynamic'：强制动态渲染，禁用静态优化
 * - 'force-static'：强制静态渲染，即使有动态函数
 * - 'error'：强制静态渲染，如果有动态函数则报错
 */
export const dynamic = "force-dynamic";

/**
 * 运行时环境配置
 *
 * 设置为 'nodejs' 使用完整的 Node.js 运行时，原因：
 * 1. 需要使用 global-agent 进行全局代理配置（仅在开发环境）
 * 2. global-agent 依赖 Node.js 原生的 http/https 模块
 * 3. Edge Runtime 不支持 Node.js 原生模块，会导致 global-agent 无法工作
 * 4. undici 的 ProxyAgent 也需要完整的 Node.js 环境
 *
 * 可选值：
 * - 'nodejs'（默认）：完整的 Node.js 运行时
 * - 'edge'：轻量级的 Edge Runtime（不支持所有 Node.js API）
 */
export const runtime = "nodejs";

/**
 * 数据重新验证时间（秒）
 *
 * 虽然设置了 force-dynamic，但 revalidate 仍然有用：
 * 1. 在开发环境，每次请求都会重新获取数据
 * 2. 在生产环境（Vercel），Next.js 可能会使用 CDN 缓存响应
 * 3. revalidate: 3600 表示 CDN 缓存 1 小时后失效，触发后台重新验证
 * 4. 这是一种"Stale-While-Revalidate"策略：返回缓存数据的同时后台更新
 *
 * 注意：这不会影响 fetch 请求本身的 cache: 'no-store' 行为
 */
export const revalidate = 3600;

export async function GET() {
  const errors: string[] = [];

  // Fetch from all sources in parallel
  const [redditPosts, hnStories, arxivPapers] = await Promise.allSettled([
    fetchRedditPosts(),
    fetchHNStories(),
    fetchArxivPapers(),
  ]);

  const items: NewsItem[] = [];

  // Process Reddit results
  if (redditPosts.status === "fulfilled") {
    items.push(...redditPosts.value);
  } else {
    errors.push(`Reddit: ${redditPosts.reason}`);
  }

  // Process HN results
  if (hnStories.status === "fulfilled") {
    items.push(...hnStories.value);
  } else {
    errors.push(`Hacker News: ${hnStories.reason}`);
  }

  // Process arXiv results
  if (arxivPapers.status === "fulfilled") {
    items.push(...arxivPapers.value);
  } else {
    errors.push(`arXiv: ${arxivPapers.reason}`);
  }

  // Deduplicate items by ID, keeping the one with highest popularity
  const itemsMap = new Map<string, NewsItem>();
  for (const item of items) {
    const existing = itemsMap.get(item.id);
    if (!existing || item.popularity > existing.popularity) {
      itemsMap.set(item.id, item);
    }
  }

  const deduplicatedItems = Array.from(itemsMap.values());

  // Sort by published date (newest first)
  deduplicatedItems.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const response: AggregateResponse = {
    items: deduplicatedItems,
    fetchedAt: new Date().toISOString(),
    errors: errors.length > 0 ? errors : undefined,
  };

  return NextResponse.json(response);
}
