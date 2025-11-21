# TypeScript 高级实践

## 概述

项目使用 TypeScript 严格模式，充分利用类型系统提升代码质量和开发体验。本文介绍项目中常用的 TypeScript 高级技巧。

## 核心概念

### 1. 类型别名 vs 接口

**核心文件**: `src/types/index.ts`

```typescript
// ✅ 类型别名：用于联合类型和字面量类型
export type NewsSource = "reddit" | "hn" | "arxiv";
export type NewsCategory = "model" | "application" | "tutorial" | "tool" | "research";
export type SortBy = "date" | "popularity";

// ✅ 接口：用于对象结构
export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: NewsSource;
  category: NewsCategory;
  publishedAt: string;
  popularity: number;
  metadata: {
    likes?: number;
    comments?: number;
    author?: string;
  };
}
```

**何时用 type？**
- ✅ 联合类型：`type Status = "pending" | "success" | "error"`
- ✅ 字面量类型：`type Direction = "left" | "right"`
- ✅ 映射类型：`type Readonly<T> = { readonly [P in keyof T]: T[P] }`
- ✅ 元组：`type Point = [number, number]`

**何时用 interface？**
- ✅ 对象结构：`interface User { name: string }`
- ✅ 类实现：`class MyClass implements MyInterface`
- ✅ 声明合并：多次声明同一接口会自动合并

**类型安全的好处：**

```typescript
// ✅ 类型检查
const source: NewsSource = "reddit";  // OK
const invalid: NewsSource = "twitter";  // ❌ 类型错误

// ✅ 自动补全
const item: NewsItem = {
  id: "1",
  title: "...",
  // IDE 会提示缺少哪些字段
};
```

### 2. Record 类型

**核心文件**: `src/types/index.ts`

```typescript
// Record<Keys, Type> 创建键值对类型
export const SOURCE_CONFIG: Record<NewsSource, { label: string; color: string }> = {
  reddit: { label: "Reddit", color: "bg-orange-500" },
  hn: { label: "Hacker News", color: "bg-orange-600" },
  arxiv: { label: "arXiv", color: "bg-red-500" },
};
```

**等价于：**

```typescript
export const SOURCE_CONFIG: {
  reddit: { label: string; color: string };
  hn: { label: string; color: string };
  arxiv: { label: string; color: string };
}
```

**但 Record 更简洁且能推导所有键！**

**类型安全的好处：**

```typescript
// ✅ 类型检查通过
const reddit = SOURCE_CONFIG.reddit;

// ❌ 类型错误
const invalid = SOURCE_CONFIG.youtube;

// ✅ 强制包含所有键
const config: Record<NewsSource, Config> = {
  reddit: {...},
  hn: {...},
  // ❌ 缺少 arxiv，TypeScript 报错
};
```

### 3. 自定义类型声明 (.d.ts)

**核心文件**: `src/types/global-agent.d.ts`

当第三方库没有类型定义时，自己编写：

```typescript
/**
 * global-agent 类型声明
 * 官方库无 @types 包，手动定义类型
 */
declare module "global-agent" {
  /**
   * 代理配置选项
   */
  export interface ProxyAgentConfigurationInput {
    /**
     * 环境变量命名空间
     * @default "GLOBAL_AGENT_"
     * @example "" - 使用标准环境变量 HTTP_PROXY
     */
    environmentVariableNamespace?: string;

    /**
     * 是否强制所有请求通过代理
     * @default false
     */
    forceGlobalAgent?: boolean;

    /**
     * Socket 连接超时（毫秒）
     * @default 60000
     */
    socketConnectionTimeout?: number;
  }

  /**
   * 启动全局代理
   * 拦截所有 http/https 模块请求
   */
  export function bootstrap(
    configurationInput?: ProxyAgentConfigurationInput
  ): void;
}
```

**关键要素：**

1. **declare module** 声明模块
2. **JSDoc 注释** 提供文档
3. **可选参数** 用 `?` 标记

**使用：**

```typescript
import { bootstrap } from "global-agent";

// ✅ TypeScript 知道参数类型
bootstrap({
  environmentVariableNamespace: "",
  forceGlobalAgent: false,
});
```

### 4. 泛型推导

**核心文件**: `src/components/ui/button.tsx`

```typescript
import { cva, type VariantProps } from "class-variance-authority";

// 定义变体函数
const buttonVariants = cva("...", {
  variants: {
    variant: { default: "...", destructive: "..." },
    size: { default: "...", sm: "...", lg: "..." },
  },
});

// 从变体函数推导 Props 类型
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {  // 👈 关键：泛型推导
  asChild?: boolean;
}

// 推导结果：
// {
//   variant?: "default" | "destructive" | "outline" | ...;
//   size?: "default" | "sm" | "lg" | "icon";
// }
```

**为什么这样设计？**

```typescript
// ❌ 手动维护类型（容易不同步）
interface ButtonProps {
  variant?: "default" | "destructive";
  size?: "default" | "sm";
}

const buttonVariants = cva("...", {
  variants: {
    variant: { default: "...", ghost: "..." },  // 添加了 ghost
    // ⚠️ 但忘记更新 ButtonProps！
  },
});

// ✅ 自动推导（单一数据源）
const buttonVariants = cva("...", {
  variants: {
    variant: { default: "...", ghost: "..." },
  },
});

type Props = VariantProps<typeof buttonVariants>;
// ✅ 自动包含 ghost
```

### 5. 可选属性与必选属性

**核心文件**: `src/types/index.ts`

```typescript
export interface NewsItem {
  // 必选属性
  id: string;
  title: string;
  url: string;

  // 可选属性（用 ? 标记）
  summary?: string;

  metadata: {
    // 所有 metadata 字段都是可选的
    likes?: number;
    comments?: number;
    upvotes?: number;
    author?: string;
  };
}
```

**使用：**

```typescript
// ✅ summary 可以省略
const item: NewsItem = {
  id: "1",
  title: "...",
  url: "...",
  // summary 省略
};

// ✅ 访问可选属性需要检查
if (item.summary) {
  console.log(item.summary);
}

// ✅ 可选链操作符
const length = item.summary?.length;  // number | undefined
```

### 6. 工具类型

**Partial - 所有属性变可选**

```typescript
type PartialNewsItem = Partial<NewsItem>;
// 等价于所有字段加 ?
```

**Pick - 选择部分属性**

```typescript
type NewsPreview = Pick<NewsItem, "id" | "title" | "url">;
// 只包含 id, title, url
```

**Omit - 排除部分属性**

```typescript
type NewsWithoutMetadata = Omit<NewsItem, "metadata">;
// 排除 metadata 字段
```

## 实际应用场景

### 场景 1：类型安全的配置对象

```typescript
const CATEGORY_CONFIG: Record<NewsCategory, { label: string; icon: string }> = {
  model: { label: "模型", icon: "🤖" },
  application: { label: "应用", icon: "💡" },
  tutorial: { label: "教程", icon: "📚" },
  tool: { label: "工具", icon: "🔧" },
  research: { label: "研究", icon: "🔬" },
};

// ✅ 如果添加新分类，TypeScript 会强制你更新这个对象
```

### 场景 2：函数参数类型约束

```typescript
function filterBySource(items: NewsItem[], source: NewsSource) {
  return items.filter(item => item.source === source);
}

// ✅ 类型检查
filterBySource(items, "reddit");

// ❌ 类型错误
filterBySource(items, "twitter");
```

### 场景 3：组件 Props 类型

```typescript
interface NewsCardProps {
  item: NewsItem;
  onLike?: () => void;  // 可选的回调函数
}

function NewsCard({ item, onLike }: NewsCardProps) {
  return (
    <div>
      <h3>{item.title}</h3>
      {onLike && <button onClick={onLike}>点赞</button>}
    </div>
  );
}
```

## 关键要点

1. **type** 适合联合类型，**interface** 适合对象结构
2. **Record** 提供类型安全的键值对配置
3. **.d.ts** 文件为第三方库添加类型定义
4. **泛型推导** 避免手动维护重复的类型定义
5. **可选属性** 用 `?` 标记，使用时需要检查

## 相关文档

- [Radix UI + CVA](./radix-ui-cva.md) - VariantProps 泛型推导实例
- [状态管理方案](../01-architecture/state-management.md) - Zustand 的类型定义

## 参考资料

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript 工具类型](https://www.typescriptlang.org/docs/handbook/utility-types.html)
