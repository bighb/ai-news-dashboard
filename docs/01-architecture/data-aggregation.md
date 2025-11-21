# 数据聚合模式

## 概述

项目从 Reddit、Hacker News、arXiv 三个数据源获取 AI 资讯。关键挑战是：如何确保即使部分数据源失败，用户仍能看到可用的内容？这就是优雅降级的数据聚合模式。

## 核心概念

### 1. 并行请求 + 优雅降级

**核心文件**: `src/app/api/aggregate/route.ts`

```typescript
// 使用 Promise.allSettled（关键！）
const [redditPosts, hnStories, arxivPapers] = await Promise.allSettled([
  fetchRedditPosts(),   // 可能成功
  fetchHNStories(),     // 可能失败
  fetchArxivPapers(),   // 可能超时
]);

const items = [];
const errors = [];

// 逐个检查结果
if (redditPosts.status === "fulfilled") {
  items.push(...redditPosts.value);
} else {
  errors.push(`Reddit: ${redditPosts.reason}`);
}

// 返回部分数据 + 错误信息
return Response.json({ items, errors });
```

**为什么用 Promise.allSettled？**

对比 `Promise.all`：

```typescript
// ❌ Promise.all - 任一失败，全部失败
try {
  const [reddit, hn, arxiv] = await Promise.all([...]);
} catch (error) {
  // Reddit 失败 → 整个 API 返回 500
  // 用户看到空页面（即使 HN 和 arXiv 正常）
}

// ✅ Promise.allSettled - 部分失败，继续执行
const [reddit, hn, arxiv] = await Promise.allSettled([...]);
// Reddit 失败 → 只影响 Reddit 数据
// 用户仍能看到 HN 和 arXiv 的内容
```

**用户体验对比：**
```
Promise.all:
  Reddit 挂了 → 整个页面空白 ❌

Promise.allSettled:
  Reddit 挂了 → 显示 HN + arXiv 内容 ✅
```

### 2. 多数据源适配器模式

每个数据源有不同的 API 结构，需要统一转换成 `NewsItem` 格式：

**统一接口**: `src/types/index.ts`

```typescript
export interface NewsItem {
  id: string;              // 唯一标识
  title: string;           // 标题
  url: string;             // 原文链接
  source: NewsSource;      // 来源：reddit | hn | arxiv
  category: NewsCategory;  // 分类
  publishedAt: string;     // 发布时间
  popularity: number;      // 热度 (0-100)
  metadata: {              // 扩展信息
    upvotes?: number;
    comments?: number;
    author?: string;
  };
}
```

**适配器实现：**

#### Reddit 适配器

**文件**: `src/lib/data-sources/reddit.ts`

```typescript
function transformRedditPost(post: RedditPost): NewsItem {
  return {
    id: `reddit-${post.data.id}`,
    title: post.data.title,
    url: post.data.url,
    source: "reddit",
    category: categorizePost(post.data.title, post.data.link_flair_text),
    publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
    popularity: Math.min(100, post.data.ups / 10 + post.data.num_comments / 5),
    metadata: {
      upvotes: post.data.ups,
      comments: post.data.num_comments,
    },
  };
}
```

#### Hacker News 适配器

**文件**: `src/lib/data-sources/hackernews.ts`

```typescript
// HN 需要两步：先获取 ID 列表，再获取详情
const topStories = await fetch(
  "https://hacker-news.firebaseio.com/v0/topstories.json"
).then(res => res.json());

// 并行获取前 30 个故事
const stories = await Promise.all(
  topStories.slice(0, 30).map(id =>
    fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      .then(res => res.json())
  )
);
```

#### arXiv 适配器

**文件**: `src/lib/data-sources/arxiv.ts`

```typescript
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

// arXiv 返回 XML，需要解析
const xml = await response.text();
const result = parser.parse(xml);
const entries = result.feed.entry;
```

### 3. 数据去重与排序

多个数据源可能有重复内容，需要去重：

```typescript
// 使用 Map 去重（O(n) 时间复杂度）
const itemsMap = new Map<string, NewsItem>();

for (const item of items) {
  const existing = itemsMap.get(item.id);

  // 保留热度更高的版本
  if (!existing || item.popularity > existing.popularity) {
    itemsMap.set(item.id, item);
  }
}

// 转换为数组并排序
const uniqueItems = Array.from(itemsMap.values());
uniqueItems.sort((a, b) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
);
```

**为什么会重复？**
- 同一文章可能在 Reddit 和 HN 都被讨论
- 同一 subreddit 的 hot 和 new 可能有重复

## 实际应用场景

### 场景 1：部分数据源不可用

```
Reddit API 正常 → 获取 50 条数据
HN API 超时    → 跳过，记录错误
arXiv API 正常 → 获取 10 条数据

最终结果：60 条数据 + 1 条错误信息
用户体验：正常浏览，只是数据少一些
```

### 场景 2：添加新数据源

步骤：
1. 创建新的适配器文件（如 `twitter.ts`）
2. 实现统一的 `NewsItem` 转换
3. 在 `aggregate/route.ts` 中添加到 `Promise.allSettled`
4. 完成！自动支持优雅降级

### 场景 3：数据源返回格式变化

```typescript
// 适配器内部处理兼容性
function transformRedditPost(post: RedditPost): NewsItem {
  return {
    // ...
    // 处理可选字段
    summary: post.data.selftext?.substring(0, 200) || undefined,
    // 处理数据格式变化
    url: post.data.url?.startsWith("http")
      ? post.data.url
      : `https://reddit.com${post.data.permalink}`,
  };
}
```

## 关键要点

1. **Promise.allSettled** 是优雅降级的关键，确保部分失败不影响整体
2. **适配器模式** 将不同数据源统一成相同接口，便于管理
3. **数据去重** 使用 Map 高效处理，避免重复内容
4. **热度归一化** 将不同数据源的热度映射到 0-100，便于统一排序
5. **错误收集** 记录失败信息，方便调试和监控

## 相关文档

- [网络代理架构](./proxy-architecture.md) - 数据获取时的代理配置
- [智能分类算法](../03-implementation/classification-algorithm.md) - 如何对聚合的数据进行分类
- [错误处理与日志](../03-implementation/error-handling.md) - 数据源失败时的错误处理

## 参考资料

- [Promise.allSettled MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)
- [适配器模式](https://refactoring.guru/design-patterns/adapter)
