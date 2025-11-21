# Next.js 16 高级特性

## 概述

Next.js 16 提供了强大的路由段配置选项，让我们能精确控制页面的渲染策略、运行时环境和缓存行为。本文介绍项目中使用的三个核心配置。

## 核心概念

### 1. 路由段配置 (Route Segment Config)

在 Next.js 中，我们可以通过导出特定的常量来配置路由的行为。

**核心文件**: `src/app/api/aggregate/route.ts`

```typescript
// 三大核心配置
export const dynamic = "force-dynamic";   // 渲染策略
export const runtime = "nodejs";          // 运行时环境
export const revalidate = 3600;           // ISR 缓存时间（秒）
```

#### dynamic - 渲染策略

控制页面是静态生成还是动态渲染：

```typescript
// 强制每次请求都动态执行（适合实时数据）
export const dynamic = "force-dynamic";
```

**为什么选择 force-dynamic？**
- 新闻数据需要实时获取
- 避免用户看到过期内容
- 配合 revalidate 实现智能缓存

#### runtime - 运行时环境

选择代码在哪种环境中运行：

```typescript
// 使用完整的 Node.js 运行时
export const runtime = "nodejs";

// 或使用轻量级 Edge Runtime（启动更快但 API 受限）
// export const runtime = "edge";
```

**项目选择 nodejs 的原因：**
- 需要使用 Node.js 特有 API（如 process.env）
- 依赖第三方库（undici、global-agent）
- 需要完整的网络代理支持

#### revalidate - ISR 缓存

实现增量静态再生成（Incremental Static Regeneration）：

```typescript
export const revalidate = 3600;  // 1小时（3600秒）
```

**工作原理：**
```
第1次请求 → 执行函数，缓存结果（1小时有效）
第2次请求 → 直接返回缓存（极快）
1小时后  → 返回旧缓存 + 后台重新生成 → 更新缓存
```

**优势：**
- 降低 API 调用成本（每小时最多调用一次）
- 提升响应速度（缓存命中 ~10ms vs 冷启动 ~2000ms）
- 保证数据新鲜度（最多1小时延迟）

### 2. Instrumentation Hook

**核心文件**: `src/instrumentation.ts`

Instrumentation 是 Next.js 的应用生命周期钩子，在服务器启动时执行一次。

```typescript
export async function register() {
  // 只在 Node.js 运行时执行
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const isDev = process.env.NODE_ENV === "development";

    // 开发环境：启用全局代理
    if (isDev && process.env.HTTP_PROXY) {
      const globalAgent = await import("global-agent");
      globalAgent.bootstrap({
        environmentVariableNamespace: "",
      });
    }
    // 生产环境：禁用代理
    else if (!isDev) {
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
    }
  }
}
```

**关键特性：**
- ✅ 只执行一次（应用启动时）
- ✅ 可访问 Node.js API
- ✅ 适合全局配置、监控初始化

**启用方式：**

在 `next.config.ts` 中开启：

```typescript
const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
};
```

## 实际应用场景

### 场景 1：API 路由缓存

```typescript
// app/api/news/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 3600;  // 1小时缓存

export async function GET() {
  const news = await fetchNews();
  return Response.json({ news });
}
```

用户体验：
- 第1次访问：等待2秒（调用API）
- 后续访问：瞬间响应（返回缓存）
- 1小时后：自动更新，用户无感知

### 场景 2：开发环境代理

```typescript
// instrumentation.ts
export async function register() {
  if (isDev && process.env.HTTP_PROXY) {
    // 自动配置代理，无需手动设置
    const globalAgent = await import("global-agent");
    globalAgent.bootstrap();
  }
}
```

开发者体验：
- 设置环境变量 `HTTP_PROXY=http://127.0.0.1:7890`
- 应用启动时自动配置代理
- 所有 API 请求自动走代理

## 关键要点

1. **dynamic = "force-dynamic"** 适合实时数据，避免静态化过期内容
2. **runtime = "nodejs"** 提供完整功能，edge 更快但受限
3. **revalidate** 是性能优化的关键，实现自动缓存更新
4. **Instrumentation Hook** 适合全局配置，在应用启动时执行
5. 三者配合使用，实现高性能的实时数据更新

## 相关文档

- [性能优化技巧](../02-frontend/performance-optimization.md) - 详细讲解 ISR 缓存策略
- [网络代理架构](./proxy-architecture.md) - Instrumentation 中的代理配置原理

## 参考资料

- [Next.js Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)
- [Next.js Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)
