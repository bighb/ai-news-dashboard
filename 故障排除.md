# 故障排查记录

本文档记录项目在开发和部署过程中遇到的问题及解决方案。

---

## 问题 1：Vercel 部署时 TypeScript 类型错误

### 时间

2025 年 11 月 20 日

### 错误信息

```
./src/instrumentation.ts:13:40
Type error: Could not find a declaration file for module 'global-agent'.
'/vercel/path0/node_modules/.pnpm/global-agent@3.0.0/node_modules/global-agent/dist/index.js'
implicitly has an 'any' type.
Try `npm i --save-dev @types/global-agent` if it exists or add a new declaration (.d.ts)
file containing `declare module 'global-agent';`
```

### 问题原因

1. **缺少类型定义**：`global-agent@3.0.0` 包没有提供 TypeScript 类型定义文件
2. **无官方类型包**：DefinitelyTyped 上不存在 `@types/global-agent` 包
3. **严格类型检查**：项目 `tsconfig.json` 启用了 `strict: true`，要求所有模块都有明确类型

### 解决方案

#### 1. 创建自定义类型声明文件

创建 `src/types/global-agent.d.ts` 文件，为 `global-agent` 模块声明完整的 TypeScript 类型：

```typescript
/**
 * TypeScript 类型声明：global-agent
 *
 * global-agent 是一个用于配置全局 HTTP/HTTPS 代理的 Node.js 库
 * 它通过修改 Node.js 原生的 http/https 模块来拦截所有请求并添加代理支持
 */

declare module "global-agent" {
  export interface ProxyAgentConfigurationInput {
    environmentVariableNamespace?: string;
    forceGlobalAgent?: boolean;
    socketConnectionTimeout?: number;
  }

  export interface ProxyAgentConfiguration {
    readonly environmentVariableNamespace: string;
    readonly forceGlobalAgent: boolean;
    readonly socketConnectionTimeout: number;
    HTTP_PROXY: string | null;
    HTTPS_PROXY: string | null;
    NO_PROXY: string | null;
  }

  export function bootstrap(
    configurationInput?: ProxyAgentConfigurationInput
  ): void;

  export function createGlobalProxyAgent(
    configurationInput?: ProxyAgentConfigurationInput
  ): ProxyAgentConfiguration;

  export namespace global {
    let GLOBAL_AGENT: ProxyAgentConfiguration | undefined;
  }
}
```

#### 2. 优化 instrumentation.ts - 添加环境判断

更新 `src/instrumentation.ts`，添加生产环境判断，避免在 Vercel 生产环境启用不必要的代理：

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // 仅在非生产环境启用代理（开发环境、预览环境等）
    // 生产环境（Vercel）不需要代理，直接访问外部 API
    const isProduction =
      process.env.NODE_ENV === "production" && process.env.VERCEL === "1";

    if (!isProduction) {
      // 将标准的代理环境变量映射为 global-agent 格式
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

        console.log("[Instrumentation] 全局代理已启用");
      }
    } else {
      console.log("[Instrumentation] 生产环境，跳过代理配置");
    }
  }
}
```

#### 3. 验证 tsconfig.json 配置

确认 `tsconfig.json` 的 `include` 配置能够识别自定义类型声明：

```json
{
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

- `**/*.ts` 会自动包含 `src/types/global-agent.d.ts`

### 验证结果

```bash
$ pnpm build

> ai-news-dashboard@0.1.0 build
> next build

   ▲ Next.js 16.0.3 (Turbopack)

   Creating an optimized production build ...
 ✓ Compiled successfully in 1683.0ms
 ✓ Finished TypeScript in 1409.0ms
 ✓ Collecting page data
 ✓ Generating static pages
 ✓ Finalizing page optimization
```

✅ TypeScript 编译成功，无类型错误

### 关键要点

1. **保留 global-agent**：该包用于开发环境解决网络代理问题，不应删除
2. **环境隔离**：通过环境变量判断，仅在开发环境启用代理
3. **完整类型声明**：不仅声明 `bootstrap()`，还包括完整的 API 接口
4. **详细注释**：代码中添加中文注释说明用途和工作原理

---

## 问题 2：Next.js 16 动态服务器使用错误

### 时间

2025 年 11 月 21 日

### 错误信息

```
Error fetching r/MachineLearning: Error: Dynamic server usage: Route /api/aggregate
couldn't be rendered statically because it used no-store fetch
https://www.reddit.com/r/MachineLearning/hot.json?limit=10 /api/aggregate.
See more info here: https://nextjs.org/docs/messages/dynamic-server-error
{
  description: "Route /api/aggregate couldn't be rendered statically because it used
  no-store fetch...",
  digest: 'DYNAMIC_SERVER_USAGE'
}
```

### 问题原因

1. **Next.js 16 默认行为**：Next.js 16 会尝试在构建时静态渲染所有路由（包括 API 路由）
2. **动态数据获取冲突**：API 路由中的 fetch 请求使用了 `cache: 'no-store'`，表示数据是动态的
3. **构建时无法处理**：静态渲染在构建时执行，无法处理需要运行时才能获取的动态数据
4. **仅 Reddit 报错**：Reddit API 请求明确使用了 no-store 缓存策略

### 解决方案

在 `src/app/api/aggregate/route.ts` 中添加路由段配置，明确标记为动态路由：

```typescript
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
 */
export const revalidate = 3600;

export async function GET() {
  // ...existing code...
}
```

### 配置说明

#### `dynamic = 'force-dynamic'`

强制路由始终动态渲染，可选值：

- `'auto'`（默认）：自动判断是否需要动态渲染
- `'force-dynamic'`：强制动态渲染，禁用静态优化
- `'force-static'`：强制静态渲染，即使有动态函数
- `'error'`：强制静态渲染，如果有动态函数则报错

#### `runtime = 'nodejs'`

指定使用完整的 Node.js 运行时，可选值：

- `'nodejs'`（默认）：完整的 Node.js 运行时，支持所有 Node.js API
- `'edge'`：轻量级的 Edge Runtime，不支持部分 Node.js API

#### `revalidate = 3600`

设置缓存重新验证时间（秒），与 `force-dynamic` 配合使用：

- API 仍然是动态的，每次请求都执行
- 但 Next.js/Vercel CDN 可能会缓存响应 1 小时
- 1 小时后触发后台重新验证，更新缓存

### 验证结果

```bash
$ pnpm build

> ai-news-dashboard@0.1.0 build
> next build

   ▲ Next.js 16.0.3 (Turbopack)

   Creating an optimized production build ...
 ✓ Compiled successfully in 2.5s
 ✓ Finished TypeScript in 2.5s
 ✓ Collecting page data
 ✓ Generating static pages
 ✓ Finalizing page optimization

Route (app)
┌ ○ /
├ ○ /_not-found
└ ƒ /api/aggregate          ← 动态 API ✓

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

✅ 路由正确标记为动态（ƒ 标记），不再尝试静态渲染

### 关键要点

1. **明确动态特性**：通过 `export const dynamic = 'force-dynamic'` 告诉 Next.js 这是动态 API
2. **运行时选择**：使用 `nodejs` 运行时确保 `global-agent` 等 Node.js 模块正常工作
3. **缓存策略**：`revalidate` 配置允许 CDN 缓存以提升性能，同时保持数据新鲜度
4. **Next.js 16 特性**：了解 Next.js 16 的静态优化默认行为，需要时显式配置动态渲染

### 相关文档

- [Next.js Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)
- [Next.js Dynamic Server Usage](https://nextjs.org/docs/messages/dynamic-server-error)
- [Next.js Data Fetching and Caching](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating)

---

## 总结

这两个问题都是 Next.js 16 升级带来的新特性和严格检查：

1. **TypeScript 严格模式**：要求所有模块都有类型定义
2. **静态优化默认开启**：需要显式配置动态路由

通过创建自定义类型声明和正确配置路由段，成功解决了部署问题。
