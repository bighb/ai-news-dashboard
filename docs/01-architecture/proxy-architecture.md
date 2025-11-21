# 网络代理架构

## 概述

由于部分数据源（Reddit、Hacker News）在国内访问受限，项目采用双层代理架构确保开发环境能正常获取数据。这是一个优雅的解决方案，既保证了开发体验，又不影响生产环境性能。

## 核心概念

### 1. 双层代理设计

项目使用两种代理方式互相补充：

```
显式代理 (undici ProxyAgent)  →  处理 fetch 调用
       +
全局代理 (global-agent)       →  处理第三方库的 http/https 调用
```

#### 第一层：显式代理 (undici ProxyAgent)

**核心文件**: `src/lib/proxy-fetch.ts`

```typescript
import { ProxyAgent, fetch as undiciFetch } from "undici";

// 从环境变量读取代理地址
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

// 创建代理实例
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

// 代理感知的 fetch 函数
export async function proxyFetch(url: string, options?: RequestInit) {
  if (dispatcher) {
    // 使用 undici 的 fetch + 代理
    return undiciFetch(url, { ...options, dispatcher });
  }
  // 无代理时使用原生 fetch
  return fetch(url, options);
}
```

**为什么用 undici？**
- Node.js 官方推荐的 HTTP 客户端
- 性能优于 node-fetch（约 3 倍）
- 原生支持代理配置

#### 第二层：全局代理 (global-agent)

**核心文件**: `src/instrumentation.ts`

```typescript
export async function register() {
  if (isDev && process.env.HTTP_PROXY) {
    const globalAgent = await import("global-agent");
    globalAgent.bootstrap({
      environmentVariableNamespace: "",  // 使用标准环境变量名
    });
  }
}
```

**global-agent 工作原理：**
- 拦截 Node.js 的 http/https 模块
- 自动为所有请求添加代理配置
- 对第三方库透明（无需修改代码）

### 2. 请求重试机制

**核心文件**: `src/lib/data-sources/reddit.ts`

网络请求可能因为各种原因失败，需要智能重试：

```typescript
async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await proxyFetch(url, options);

      if (response.ok) return response;

      // 服务器错误（5xx）才重试
      if (response.status >= 500 && i < retries - 1) {
        // 指数退避：等待 1s, 2s, 3s
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Max retries reached");
}
```

**关键算法：指数退避**
```
第1次失败：等待 1秒
第2次失败：等待 2秒
第3次失败：等待 3秒
```

**为什么不立即重试？**
- 避免雪崩效应（服务器过载时会更糟）
- 给服务器恢复的时间
- 符合大多数 API 的 rate limit 策略

### 3. 超时控制

```typescript
const response = await fetchWithRetry(url, {
  signal: AbortSignal.timeout(10000),  // 10秒超时
  cache: "no-store",
});
```

**AbortSignal.timeout() 作用：**
- 10秒后自动取消请求
- 避免无限等待
- 配合重试机制使用

### 4. 频率限制

防止触发 API 的 rate limit：

```typescript
// 请求间隔 500ms
for (let i = 0; i < subreddits.length; i++) {
  const posts = await fetchSubreddit(subreddits[i]);

  if (i < subreddits.length - 1) {
    await new Promise(r => setTimeout(r, 500));  // 延迟 500ms
  }
}
```

**计算：**
- 3个 subreddit × 500ms 间隔 = 总耗时 ~1.5秒
- 请求频率：2次/秒 = 120次/分钟
- Reddit 限制：60次/分钟（匿名）
- ✅ 在安全范围内

## 实际应用场景

### 场景 1：开发环境配置

```bash
# .env.local
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

启动应用后：
1. Instrumentation 读取环境变量
2. 自动配置 global-agent
3. 所有请求自动走代理
4. 无需修改任何业务代码

### 场景 2：生产环境部署

```typescript
// instrumentation.ts 自动判断
if (!isDev) {
  delete process.env.HTTP_PROXY;
  delete process.env.HTTPS_PROXY;
}
```

生产环境特点：
- 自动禁用代理
- 直连数据源（更快）
- 降低部署成本

### 场景 3：处理不稳定的 API

```typescript
// 重试 + 超时 + 降级
try {
  const data = await fetchWithRetry(url, options, 3);
  return data;
} catch (error) {
  console.error("API failed after 3 retries:", error);
  return [];  // 返回空数组，不中断整体流程
}
```

## 关键要点

1. **双层代理**确保所有类型的网络请求都能通过代理
2. **指数退避**是重试的最佳实践，避免雪崩
3. **超时控制**防止请求无限等待，提升用户体验
4. **频率限制**尊重 API 的 rate limit，避免被封禁
5. **环境感知**开发用代理，生产直连，自动切换

## 相关文档

- [Next.js 高级特性](./nextjs-advanced.md) - Instrumentation Hook 详解
- [错误处理与日志](../03-implementation/error-handling.md) - 重试失败后的错误处理
- [数据聚合模式](./data-aggregation.md) - 如何在数据聚合中使用代理

## 参考资料

- [undici 文档](https://undici.nodejs.org/)
- [global-agent GitHub](https://github.com/gajus/global-agent)
