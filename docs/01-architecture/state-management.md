# 状态管理方案

## 概述

项目使用两种状态管理工具：Zustand 管理 UI 状态（筛选器），React Query 管理服务端数据（新闻列表）。这种组合既轻量又强大，避免了 Redux 的复杂性。

## 核心概念

### 1. Zustand - UI 状态管理

**核心文件**: `src/stores/filter-store.ts`

Zustand 是一个极简的状态管理库，只需 3 步：

```typescript
import { create } from "zustand";

// 1. 定义状态类型
interface FilterState {
  sources: Record<NewsSource, boolean>;
  categories: Record<NewsCategory, boolean>;
  sortBy: "date" | "popularity";

  // Actions
  toggleSource: (source: NewsSource) => void;
  toggleCategory: (category: NewsCategory) => void;
  setSortBy: (sortBy: "date" | "popularity") => void;
  resetFilters: () => void;
}

// 2. 创建 Store
export const useFilterStore = create<FilterState>((set) => ({
  // 初始状态
  sources: { reddit: true, hn: true, arxiv: true },
  categories: { model: true, application: true, tutorial: true },
  sortBy: "date",

  // Actions
  toggleSource: (source) =>
    set((state) => ({
      sources: { ...state.sources, [source]: !state.sources[source] },
    })),

  toggleCategory: (category) =>
    set((state) => ({
      categories: { ...state.categories, [category]: !state.categories[category] },
    })),

  setSortBy: (sortBy) => set({ sortBy }),

  resetFilters: () => set({ /* 默认值 */ }),
}));
```

**在组件中使用：**

```typescript
function FilterSheet() {
  // 选择性订阅（性能优化）
  const sources = useFilterStore(state => state.sources);
  const toggleSource = useFilterStore(state => state.toggleSource);

  return (
    <Checkbox
      checked={sources.reddit}
      onCheckedChange={() => toggleSource("reddit")}
    />
  );
}
```

**为什么选择 Zustand？**

对比 Redux：

| 特性 | Redux | Zustand |
|------|-------|---------|
| Bundle 大小 | ~8KB | ~1KB |
| API 复杂度 | 需要 actions/reducers | 直接 set |
| Provider | 必需 | 不需要 |
| TypeScript | 需配置 | 开箱即用 |
| 学习曲线 | 陡峭 | 平缓 |

### 2. React Query - 服务端数据缓存

**核心文件**: `src/components/providers.tsx`

React Query 自动管理数据的获取、缓存、更新：

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60,       // 1小时内数据是新鲜的
      gcTime: 1000 * 60 * 60 * 2,      // 2小时后清理缓存
      refetchOnWindowFocus: false,     // 窗口聚焦不刷新
      retry: 3,                        // 失败重试3次
    },
  },
});
```

**在组件中使用：**

```typescript
function NewsGrid() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const res = await fetch("/api/aggregate");
      const json = await res.json();
      return json.items;
    },
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Error />;

  return <div>{data.map(item => <NewsCard key={item.id} {...item} />)}</div>;
}
```

**关键配置解释：**

#### staleTime（数据新鲜度）

```
数据生命周期：
  fresh → stale → inactive → garbage collected

  0秒 ─── 3600秒 ─── 7200秒 ─── ∞
   ↑        ↑         ↑
 获取数据  标记过期  开始回收
```

**示例：**
```
t=0分钟:  useQuery() → 发起请求 → 标记为 fresh
t=30分钟: useQuery() → 直接使用缓存（不请求）
t=61分钟: useQuery() → 返回旧缓存 + 后台刷新
```

#### gcTime（垃圾回收时间）

```typescript
gcTime: 1000 * 60 * 60 * 2  // 2小时

// 组件卸载后：
// - 数据标记为 inactive
// - 开始2小时倒计时
// - 倒计时结束后删除缓存
// - 如果有组件重新使用，重置倒计时
```

#### refetchOnWindowFocus

```typescript
refetchOnWindowFocus: false

// 用户切换标签页后回来：
// false → 不刷新（适合新闻类应用）
// true  → 刷新（适合股票、聊天等实时应用）
```

### 3. 双层缓存策略

项目使用前端 + 后端双层缓存：

```
用户浏览器
   ↓
React Query 缓存（1小时）← 第一层
   ↓
Next.js ISR 缓存（1小时） ← 第二层
   ↓
数据源 API
```

**缓存命中场景：**

```
场景1: 用户首次访问
  React Query: miss
  Next.js ISR: miss
  → 调用数据源 API (~2000ms)

场景2: 用户刷新页面（1分钟后）
  React Query: hit (fresh)
  → 本地缓存 (~0ms)

场景3: 用户关闭页面再打开（30分钟后）
  React Query: miss (已被GC)
  Next.js ISR: hit
  → API 缓存 (~50ms)

场景4: 另一用户访问（同时间）
  React Query: miss (不同用户)
  Next.js ISR: hit (共享缓存)
  → API 缓存 (~50ms)
```

## 实际应用场景

### 场景 1：筛选器状态管理

```typescript
// 用户操作：勾选/取消 Reddit 数据源
const toggleSource = useFilterStore(state => state.toggleSource);
toggleSource("reddit");

// Zustand 自动：
// 1. 更新状态
// 2. 通知所有订阅组件
// 3. 组件重新渲染
```

### 场景 2：数据自动刷新

```typescript
// 配置自动刷新
const { data } = useQuery({
  queryKey: ["news"],
  queryFn: fetchNews,
  refetchInterval: 1000 * 60 * 5,  // 每5分钟刷新
});

// React Query 自动：
// 1. 后台定时请求
// 2. 更新数据时，UI 自动更新
// 3. 用户无感知
```

### 场景 3：手动刷新

```typescript
function NewsGrid() {
  const { refetch } = useQuery({...});

  const handleRefresh = () => {
    refetch();  // 忽略 staleTime，立即刷新
  };

  return <Button onClick={handleRefresh}>刷新</Button>;
}
```

## 关键要点

1. **Zustand** 适合简单的 UI 状态，无需 Provider，极简 API
2. **React Query** 专注服务端数据，自动处理缓存、重试、更新
3. **staleTime** 控制数据新鲜度，减少不必要的请求
4. **gcTime** 控制缓存清理时机，平衡性能和内存
5. **双层缓存**（前端+后端）实现最佳性能和用户体验

## 相关文档

- [Next.js 高级特性](./nextjs-advanced.md) - 后端 ISR 缓存配置
- [性能优化技巧](../02-frontend/performance-optimization.md) - 缓存策略详解

## 参考资料

- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [TanStack Query 文档](https://tanstack.com/query/latest)
