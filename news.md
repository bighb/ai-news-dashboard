**你的需求画像**：

- 每天 1 小时获取 AI 动态
- 喜欢推送摘要，热门/高讨论度内容
- 关注：新模型发布、行业应用、技术教程、AI 工具
- 信息源：AI 公司博客、X、Reddit、HackerNews、arXiv
- 需要筛选过滤、标注来源
- 技术复杂度要低，重点是获取信息

**我的推荐：Web 应用（Practice 级别）**

为什么选择 Web 应用：

1. **技术复杂度最低** - 纯前端开发，你最擅长
2. **快速开发** - 可以在周末完成核心功能
3. **跨设备访问** - 任何设备的浏览器都能用
4. **易于部署** - Vercel 免费部署，无需运维

这是一个**信息聚合看板（AI News Dashboard）**，核心价值是"一个页面看完所有重要 AI 动态"。

现在让我为你生成完整的产品设计文档：

---

# AI News Dashboard - 产品设计文档

## 1. 产品概述

**产品定位**：个人 AI 资讯聚合看板

**核心价值**：在单一页面聚合多个 AI 信息源的热门内容，通过智能筛选和分类，让你在 1 小时内高效获取最有价值的 AI 动态。

**目标用户**：关注 AI 发展的技术从业者、开发者

**成功标准**：

- 每天能看到 20-30 条高质量 AI 动态
- 覆盖 5+ 主要信息源
- 筛选准确率 >80%（减少无关信息）

---

## 2. 功能需求

### 2.1 核心功能

#### 信息聚合展示

- **卡片式布局**：每条资讯一个卡片，包含：

  - 标题（可点击跳转）
  - 摘要（自动提取或手动）
  - 来源标签（X/Reddit/HN/arXiv/公司博客）
  - 发布时间
  - 热度指标（点赞数/评论数/投票数）
  - 分类标签（新模型/行业应用/技术教程/AI 工具）

- **视图模式**：
  - 时间流模式（按时间倒序）
  - 热度模式（按热度排序）
  - 分类视图（按内容类型分组）

#### 信息源配置

支持的信息源：

1. **X (Twitter)**

   - 关注的 AI 公司官方账号：OpenAI, Anthropic, Google AI, Meta AI, Mistral AI
   - 热门 AI KOL 推文

2. **Reddit**

   - r/MachineLearning
   - r/artificial
   - r/LocalLLaMA

3. **Hacker News**

   - AI/ML 相关的热门帖子（>100 upvotes）

4. **arXiv**

   - cs.AI, cs.CL, cs.LG 最新论文（每日 Top 5）

5. **AI 公司博客**
   - OpenAI Blog
   - Anthropic Blog
   - Google AI Blog
   - Meta AI Research

#### 过滤与筛选

- **按来源筛选**：可以显示/隐藏特定来源
- **按分类筛选**：新模型/行业应用/技术教程/AI 工具
- **热度阈值**：设置最低热度标准
- **关键词过滤**：支持关键词黑名单/白名单

#### 个性化设置

- **刷新频率**：可选 1 小时/3 小时/6 小时自动刷新
- **每日摘要时间**：设置每天查看的时间段（比如早上 9 点）
- **内容数量**：每次显示的条目数（默认 30）

### 2.2 辅助功能

- **标记已读**：点击卡片自动标记为已读，灰色显示
- **快速预览**：鼠标悬停显示更多信息
- **深色模式**：护眼主题
- **导出**：虽然你说不需要，但我建议保留"复制链接"功能

---

## 3. 技术架构

### 3.1 技术栈（基于你的偏好）

**前端**：

```
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS + shadcn/ui
- State Management: Zustand (轻量级，够用)
- Data Fetching: TanStack Query (React Query)
- Package Manager: pnpm
```

**数据层**：

```
- RSS Parser: rss-parser (处理博客订阅)
- Reddit API: snoowrap 或直接 fetch
- HN API: 官方 Firebase API
- arXiv API: 官方 API
- X API: 由于限制，用第三方聚合服务或 RSS
```

**部署**：

```
- Hosting: Vercel (免费额度够用)
- Domain: 可选（Vercel 提供免费子域名）
```

**为什么这个技术栈**：

1. Next.js 14 - 你熟悉，自带 API Routes 可以代理第三方 API
2. TypeScript - 类型安全，减少 bug
3. Tailwind + shadcn/ui - 快速搭建 UI，组件开箱即用
4. Zustand - 比 Redux 简单，比 Context 强大
5. TanStack Query - 自动缓存、刷新、错误处理

### 3.2 系统架构

```
┌─────────────────────────────────────────┐
│          Browser (Client Side)          │
│  ┌────────────────────────────────────┐ │
│  │  Next.js App (React Components)    │ │
│  │  - Dashboard Page                  │ │
│  │  - Filter Controls                 │ │
│  │  - Settings Panel                  │ │
│  └────────────────────────────────────┘ │
│           ↕ TanStack Query              │
│  ┌────────────────────────────────────┐ │
│  │     Client State (Zustand)         │ │
│  │  - User Preferences                │ │
│  │  - Read Status                     │ │
│  │  - Filter Settings                 │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    ↕ HTTP
┌─────────────────────────────────────────┐
│      Next.js API Routes (Server)        │
│  ┌────────────────────────────────────┐ │
│  │  /api/aggregate                    │ │
│  │  - Fetch from multiple sources     │ │
│  │  - Normalize data format           │ │
│  │  - Cache for 1 hour                │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
        ↕           ↕           ↕
┌─────────────────────────────────────────┐
│         External Data Sources           │
│  - X/Twitter RSS or API                 │
│  - Reddit API                           │
│  - Hacker News API                      │
│  - arXiv API                            │
│  - Company Blogs (RSS)                  │
└─────────────────────────────────────────┘
```

**数据流**：

1. 客户端每 1 小时（或手动）触发数据刷新
2. Next.js API Route 聚合多个数据源
3. 服务端缓存结果（减少 API 调用）
4. 客户端用 TanStack Query 缓存 + 状态管理
5. 用户筛选/过滤仅在客户端进行（性能更好）

### 3.3 数据模型

```typescript
// 统一的资讯条目接口
interface NewsItem {
  id: string; // 唯一标识
  title: string; // 标题
  summary?: string; // 摘要
  url: string; // 原文链接
  source: "x" | "reddit" | "hn" | "arxiv" | "blog"; // 来源
  sourceName: string; // 具体来源名称（如 "OpenAI Blog"）
  category: "model" | "application" | "tutorial" | "tool" | "research";
  publishedAt: Date; // 发布时间
  popularity: number; // 热度分数（归一化）
  metadata: {
    likes?: number; // 点赞数
    comments?: number; // 评论数
    upvotes?: number; // 投票数
    author?: string; // 作者
  };
}

// 用户设置
interface UserSettings {
  sources: {
    [key in NewsItem["source"]]: boolean; // 启用/禁用某个来源
  };
  categories: {
    [key in NewsItem["category"]]: boolean;
  };
  refreshInterval: 1 | 3 | 6; // 小时
  minPopularity: number; // 最低热度
  darkMode: boolean;
}

// 已读状态（存在 localStorage）
interface ReadStatus {
  [itemId: string]: {
    readAt: Date;
    isRead: boolean;
  };
}
```

---

## 4. 项目结构

```
ai-news-dashboard/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── page.tsx           # 主页（Dashboard）
│   │   ├── layout.tsx         # 根布局
│   │   ├── globals.css        # 全局样式
│   │   └── api/               # API Routes
│   │       └── aggregate/
│   │           └── route.ts   # 聚合数据接口
│   │
│   ├── components/            # React 组件
│   │   ├── news-card.tsx     # 资讯卡片
│   │   ├── filter-bar.tsx    # 过滤器
│   │   ├── settings-panel.tsx # 设置面板
│   │   ├── news-grid.tsx     # 卡片网格布局
│   │   └── ui/               # shadcn/ui 组件
│   │
│   ├── lib/                   # 工具函数
│   │   ├── data-sources/     # 数据源适配器
│   │   │   ├── twitter.ts
│   │   │   ├── reddit.ts
│   │   │   ├── hackernews.ts
│   │   │   ├── arxiv.ts
│   │   │   └── blogs.ts
│   │   ├── aggregator.ts     # 数据聚合逻辑
│   │   ├── normalizer.ts     # 数据格式统一
│   │   └── utils.ts          # 通用工具
│   │
│   ├── stores/               # Zustand 状态管理
│   │   ├── settings.ts       # 用户设置
│   │   └── read-status.ts    # 已读状态
│   │
│   └── types/                # TypeScript 类型定义
│       └── index.ts
│
├── public/                   # 静态资源
│   └── logos/               # 各平台 logo
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## 5. 开发路线图

### Phase 1: 核心功能（2-3 天）

**Day 1: 项目搭建 + 单个数据源**

- [ ] 初始化 Next.js + TypeScript 项目
- [ ] 配置 Tailwind CSS + shadcn/ui
- [ ] 实现 Reddit API 集成（最简单）
- [ ] 创建基础卡片组件
- [ ] 数据展示（时间流）

**Day 2: 多数据源聚合**

- [ ] 集成 Hacker News API
- [ ] 集成 arXiv API
- [ ] 集成 AI 公司博客（RSS）
- [ ] 实现数据聚合逻辑
- [ ] API Route 缓存机制

**Day 3: 过滤和交互**

- [ ] 实现来源过滤
- [ ] 实现分类筛选
- [ ] 已读状态管理（localStorage）
- [ ] 热度排序功能

### Phase 2: 优化体验（1-2 天）

**Day 4: UI 优化**

- [ ] 深色模式
- [ ] 响应式设计（手机端）
- [ ] 加载状态优化
- [ ] 错误处理

**Day 5: 设置面板**

- [ ] 用户偏好设置
- [ ] 设置持久化
- [ ] 自动刷新功能

### Phase 3: X (Twitter) 集成（可选）

**注意**：X API 需要付费或使用第三方服务

- 选项 1: 使用 RSS Bridge 服务
- 选项 2: 使用 Nitter 实例（第三方 Twitter 前端）
- 选项 3: 手动维护一个 AI KOL 列表，用 RSS 订阅

### Phase 4: 部署上线（0.5 天）

- [ ] 部署到 Vercel
- [ ] 配置环境变量
- [ ] 测试生产环境

**总计**: 最快 3-4 天可以完成 MVP，完整版约 5-7 天

---

## 6. 数据源具体实现

### 6.1 Reddit

```typescript
// lib/data-sources/reddit.ts
const SUBREDDITS = ["MachineLearning", "artificial", "LocalLLaMA"];

async function fetchRedditPosts() {
  const posts = [];
  for (const subreddit of SUBREDDITS) {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`
    );
    const data = await response.json();
    posts.push(...data.data.children.map((child) => child.data));
  }
  return posts;
}
```

### 6.2 Hacker News

```typescript
// lib/data-sources/hackernews.ts
async function fetchHNStories() {
  // 获取 top stories
  const topStories = await fetch(
    "https://hacker-news.firebaseio.com/v0/topstories.json"
  );
  const storyIds = await topStories.json();

  // 获取前 30 个故事详情
  const stories = await Promise.all(
    storyIds
      .slice(0, 30)
      .map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(
          (r) => r.json()
        )
      )
  );

  // 过滤出 AI 相关（标题包含关键词）
  return stories.filter((story) =>
    /AI|machine learning|LLM|GPT|Claude|neural/i.test(story.title)
  );
}
```

### 6.3 arXiv

```typescript
// lib/data-sources/arxiv.ts
async function fetchArxivPapers() {
  const categories = ["cs.AI", "cs.CL", "cs.LG"];
  const papers = [];

  for (const cat of categories) {
    const response = await fetch(
      `http://export.arxiv.org/api/query?search_query=cat:${cat}&sortBy=submittedDate&sortOrder=descending&max_results=5`
    );
    const xml = await response.text();
    // 解析 XML (使用 fast-xml-parser)
    papers.push(...parseArxivXML(xml));
  }

  return papers;
}
```

### 6.4 AI 公司博客（RSS）

```typescript
// lib/data-sources/blogs.ts
import Parser from "rss-parser";

const BLOG_FEEDS = [
  "https://openai.com/blog/rss.xml",
  "https://www.anthropic.com/news/rss",
  "https://ai.googleblog.com/feeds/posts/default",
  // Meta AI 等
];

async function fetchBlogPosts() {
  const parser = new Parser();
  const posts = [];

  for (const feed of BLOG_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed);
      posts.push(...parsed.items.slice(0, 5));
    } catch (error) {
      console.error(`Failed to fetch ${feed}:`, error);
    }
  }

  return posts;
}
```

---

## 7. 关键技术决策

### 7.1 为什么不用数据库？

**原因**：

- 数据都是公开的，不需要持久化存储
- 实时聚合更简单，不需要维护数据同步
- 减少运维成本（无需数据库服务器）
- API 缓存（1 小时）足够满足需求

**用户数据**：

- 已读状态、设置等存储在 localStorage
- 未来可选：加入用户账号系统（Supabase Auth）

### 7.2 为什么用 Next.js API Routes？

**原因**：

- CORS 问题：直接在客户端调用第三方 API 会遇到跨域
- API Key 保护：Reddit、X 等需要 API Key，不能暴露在前端
- 缓存控制：服务端可以实现更好的缓存策略
- 统一接口：前端只需调用 `/api/aggregate`

### 7.3 热度归一化算法

不同平台的热度指标不同（点赞/评论/upvotes），需要归一化：

```typescript
function normalizePopularity(item: RawNewsItem): number {
  const weights = {
    reddit: { upvotes: 1, comments: 0.5 },
    hn: { score: 1, descendants: 0.3 },
    x: { likes: 0.5, retweets: 1, replies: 0.3 },
  };

  // 根据来源计算加权分数
  let score = 0;
  if (item.source === "reddit") {
    score =
      item.upvotes * weights.reddit.upvotes +
      item.comments * weights.reddit.comments;
  }
  // ... 其他来源

  // 归一化到 0-100
  return Math.min(100, score / 10);
}
```

---

## 8. UI/UX 设计原则

### 8.1 信息密度

- 单屏显示 6-9 条卡片（桌面端）
- 卡片高度一致，便于扫描
- 关键信息优先：标题 > 来源 > 时间 > 热度

### 8.2 视觉层级

```
优先级 1 (最醒目): 标题、分类标签
优先级 2: 来源图标、时间
优先级 3: 热度指标、摘要
优先级 4: 已读状态（灰色）
```

### 8.3 交互设计

- **一键操作**：点击卡片 = 打开原文 + 标记已读
- **快速筛选**：顶部固定过滤器，无需滚动
- **即时反馈**：筛选后立即更新，无需刷新页面
- **键盘快捷键**（可选）：
  - `R` - 刷新
  - `F` - 打开过滤器
  - `D` - 切换深色模式

### 8.4 响应式设计

- **桌面端 (>1024px)**：3 列网格
- **平板端 (768-1024px)**：2 列网格
- **手机端 (<768px)**：1 列列表，简化卡片信息

---

## 9. 性能优化

### 9.1 数据获取

- **并行请求**：所有数据源同时请求，不阻塞
- **超时控制**：单个数据源超时 5s，不影响其他
- **增量加载**：首屏加载 30 条，滚动加载更多

### 9.2 渲染优化

- **虚拟滚动**：超过 100 条时启用（react-window）
- **图片懒加载**：来源 logo 使用 next/image
- **代码分割**：设置面板按需加载

### 9.3 缓存策略

```typescript
// API Route 缓存
export const revalidate = 3600; // 1 hour

// TanStack Query 缓存
const { data } = useQuery({
  queryKey: ["news"],
  queryFn: fetchNews,
  staleTime: 1000 * 60 * 60, // 1 hour
  cacheTime: 1000 * 60 * 60 * 2, // 2 hours
});
```

---

## 10. 后续扩展方向

### 短期（1-2 周）

- [ ] 添加搜索功能（关键词搜索）
- [ ] 邮件订阅（每日摘要）
- [ ] PWA 支持（添加到主屏幕）

### 中期（1-2 月）

- [ ] 用户账号系统（同步设置到云端）
- [ ] AI 摘要生成（用 Claude API 总结文章）
- [ ] 推荐算法（基于阅读历史）

### 长期（3 月+）

- [ ] 移动端 App（React Native）
- [ ] 浏览器扩展（快速查看）
- [ ] 社区功能（分享评论）

---

## 11. 开发环境配置

```bash
# 创建项目
pnpm create next-app@latest ai-news-dashboard --typescript --tailwind --app

# 安装依赖
cd ai-news-dashboard
pnpm add zustand @tanstack/react-query axios rss-parser date-fns
pnpm add -D @types/rss-parser

# 安装 shadcn/ui
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add card button badge switch separator

# 启动开发服务器
pnpm dev
```

**环境变量** (`.env.local`):

```bash
# Reddit API (optional, 可以不用认证访问 public API)
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret

# 如果用 X API
TWITTER_BEARER_TOKEN=your_bearer_token
```

---

## 12. 测试策略

### 开发阶段

- **单元测试**：数据聚合逻辑、归一化函数
- **集成测试**：API Routes 测试
- **手动测试**：UI 交互、各种筛选组合

### 工具

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
```

---

## 总结

这是一个**复杂度适中、实用性强**的项目：

**优点**：

- ✅ 技术栈你熟悉（React/Next.js/TypeScript）
- ✅ 无需后端数据库（降低复杂度）
- ✅ 可以快速迭代（3-7 天 MVP）
- ✅ 实际解决你的需求
- ✅ 可以持续优化（加功能很容易）

**技术亮点**：

- 数据聚合与归一化
- 多数据源并发处理
- 智能缓存策略
- 状态管理实践
