# 错误处理与日志

## 概述

良好的错误处理是系统稳定性的关键。项目采用优雅降级策略，确保部分功能失败不影响整体用户体验。同时通过结构化日志，方便问题排查。

## 核心概念

### 1. 优雅降级设计

**核心文件**: `src/app/api/aggregate/route.ts`

```typescript
// 使用 Promise.allSettled 确保部分失败不影响整体
const [redditPosts, hnStories, arxivPapers] = await Promise.allSettled([
  fetchRedditPosts(),
  fetchHNStories(),
  fetchArxivPapers(),
]);

const items: NewsItem[] = [];
const errors: string[] = [];

// 逐个检查结果
if (redditPosts.status === "fulfilled") {
  items.push(...redditPosts.value);
} else {
  errors.push(`Reddit: ${redditPosts.reason}`);
  console.error("[Aggregate] Reddit failed:", redditPosts.reason);
}

// 返回部分数据 + 错误信息
return Response.json({
  items,
  errors: errors.length > 0 ? errors : undefined,
  timestamp: new Date().toISOString(),
});
```

**关键设计：**
- ✅ 部分失败不影响整体
- ✅ 收集错误信息用于调试
- ✅ 用户仍能看到可用数据

### 2. 错误分类

#### 网络错误

```typescript
try {
  const response = await fetch(url);
} catch (error) {
  if (error instanceof TypeError) {
    // 网络错误：CORS、DNS、连接超时
    console.error("[Network] Failed to fetch:", error.message);
  }
}
```

#### HTTP 错误

```typescript
const response = await fetch(url);

if (!response.ok) {
  if (response.status === 429) {
    // Rate Limit
    throw new Error("Too many requests, please try again later");
  } else if (response.status >= 500) {
    // 服务器错误（可重试）
    throw new Error("Server error, retrying...");
  } else if (response.status === 404) {
    // 资源不存在（不可重试）
    throw new Error("Resource not found");
  }
}
```

#### 数据解析错误

```typescript
try {
  const data = await response.json();

  // 验证数据结构
  if (!Array.isArray(data.children)) {
    throw new Error("Invalid data format");
  }

  return data;
} catch (error) {
  if (error instanceof SyntaxError) {
    // JSON 解析失败
    console.error("[Parse] Invalid JSON:", error);
  }
  throw error;
}
```

### 3. 结构化日志

**核心文件**: `src/lib/data-sources/reddit.ts`

```typescript
// 使用前缀标记日志来源
console.log("[Reddit] Fetching posts from:", subreddit);
console.log("[Reddit] Rate limit delay: 500ms");
console.error("[Reddit] Request failed:", {
  subreddit,
  error: error.message,
  attempt: i + 1,
  maxRetries: retries,
});
```

**日志级别：**

```typescript
// 1. 调试信息（开发环境）
console.log("[Debug] Processing item:", item);

// 2. 信息
console.info("[Info] Fetched", items.length, "items");

// 3. 警告
console.warn("[Warning] Slow response detected: 5s");

// 4. 错误
console.error("[Error] Failed to fetch:", error);
```

**环境感知日志：**

```typescript
const isDev = process.env.NODE_ENV === "development";

// 开发环境：详细日志
if (isDev) {
  console.log("[Debug] Request details:", {
    url,
    headers,
    params,
  });
}

// 生产环境：只记录错误
if (!isDev && error) {
  console.error("[Error]", error);
}
```

### 4. 错误边界

**React Error Boundary**（Next.js 13+）：

**文件**: `app/error.tsx`

```typescript
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">出错了！</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded"
      >
        重试
      </button>
    </div>
  );
}
```

**API 路由错误处理：**

```typescript
// app/api/aggregate/route.ts
export async function GET() {
  try {
    const items = await aggregateNews();
    return Response.json({ items });
  } catch (error) {
    console.error("[Aggregate] Fatal error:", error);

    return Response.json(
      {
        error: "Failed to fetch news",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

### 5. 重试机制错误处理

**核心文件**: `src/lib/data-sources/reddit.ts`

```typescript
async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await proxyFetch(url, options);

      if (response.ok) return response;

      // 记录失败但继续重试
      if (response.status >= 500 && i < retries - 1) {
        console.warn(
          `[Retry] Attempt ${i + 1}/${retries} failed with status ${response.status}`
        );
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }

      return response;
    } catch (error) {
      // 最后一次失败，抛出错误
      if (i === retries - 1) {
        console.error(`[Retry] All ${retries} attempts failed:`, error);
        throw error;
      }

      // 记录并重试
      console.warn(`[Retry] Attempt ${i + 1}/${retries} error:`, error);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }

  throw new Error("Max retries reached");
}
```

## 实际应用场景

### 场景 1：数据源不可用

```
Reddit API 挂了:
  1. fetchRedditPosts() 抛出错误
  2. Promise.allSettled 捕获错误
  3. 记录错误信息到 errors 数组
  4. 继续处理 HN 和 arXiv
  5. 返回可用数据 + 错误信息

用户体验:
  - 看到 HN 和 arXiv 的内容
  - 不会看到空白页面
  - 开发者控制台有错误日志
```

### 场景 2：网络超时

```
请求超时:
  1. AbortSignal.timeout(10000) 触发
  2. fetch 抛出 AbortError
  3. 重试机制启动
  4. 等待 1 秒后重试
  5. 如果仍失败，返回优雅降级
```

### 场景 3：调试生产问题

```typescript
// 添加请求 ID 用于追踪
const requestId = crypto.randomUUID();

console.log(`[${requestId}] Starting request to Reddit`);
console.log(`[${requestId}] Response status:`, response.status);
console.error(`[${requestId}] Request failed:`, error);

// 便于在日志中追踪单个请求的完整生命周期
```

## 错误处理最佳实践

### 1. 分层错误处理

```
数据源层:
  → 记录错误
  → 重试（如果合适）
  → 抛出标准化错误

API 层:
  → 捕获数据源错误
  → 收集所有错误
  → 返回部分数据 + 错误列表

组件层:
  → 显示错误边界
  → 提供重试按钮
  → 降级 UI
```

### 2. 错误信息设计

```typescript
// ❌ 不友好
throw new Error("Error");

// ✅ 描述性强
throw new Error("Failed to fetch Reddit posts: Rate limit exceeded (429)");

// ✅ 包含上下文
throw new Error(
  `Failed to parse response from ${url}: ${error.message}`
);
```

### 3. 用户友好的错误提示

```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // 开发环境：显示详细错误
    if (process.env.NODE_ENV === "development") {
      return error.message;
    }

    // 生产环境：显示友好提示
    if (error.message.includes("429")) {
      return "请求过于频繁，请稍后再试";
    }
    if (error.message.includes("timeout")) {
      return "网络连接超时，请检查网络";
    }

    return "加载失败，请重试";
  }

  return "未知错误";
}
```

## 关键要点

1. **优雅降级**确保部分失败不影响整体用户体验
2. **错误分类**有助于快速定位问题（网络、HTTP、解析）
3. **结构化日志**使用前缀标记，方便过滤和追踪
4. **错误边界**提供用户友好的错误页面和重试机制
5. **环境感知**开发环境详细日志，生产环境精简日志

## 相关文档

- [网络代理架构](../01-architecture/proxy-architecture.md) - 重试机制详解
- [数据聚合模式](../01-architecture/data-aggregation.md) - Promise.allSettled 优雅降级

## 参考资料

- [Error Handling Best Practices](https://www.joyent.com/node-js/production/design/errors)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
