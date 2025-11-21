# 智能分类算法

## 概述

项目自动将来自不同数据源的新闻分类为：模型、应用、教程、工具、研究五大类别。通过关键词匹配和优先级策略，实现准确的内容分类。

## 核心概念

### 1. Reddit 分类逻辑

**核心文件**: `src/lib/data-sources/reddit.ts`

```typescript
function categorizePost(title: string, flair?: string): NewsCategory {
  const lowerTitle = title.toLowerCase();
  const lowerFlair = flair?.toLowerCase() || "";

  // 优先级 1: Flair（标签）
  if (lowerFlair.includes("tutorial") || lowerFlair.includes("guide")) {
    return "tutorial";
  }

  // 优先级 2: 教程关键词
  if (
    lowerTitle.includes("tutorial") ||
    lowerTitle.includes("guide") ||
    lowerTitle.includes("how to") ||
    lowerTitle.includes("learn")
  ) {
    return "tutorial";
  }

  // 优先级 3: 模型关键词
  if (
    lowerTitle.includes("gpt") ||
    lowerTitle.includes("llama") ||
    lowerTitle.includes("claude") ||
    lowerTitle.includes("gemini") ||
    lowerTitle.includes("model")
  ) {
    return "model";
  }

  // 优先级 4: 工具关键词
  if (
    lowerTitle.includes("tool") ||
    lowerTitle.includes("library") ||
    lowerTitle.includes("framework") ||
    lowerTitle.includes("api")
  ) {
    return "tool";
  }

  // 优先级 5: 研究关键词
  if (
    lowerTitle.includes("research") ||
    lowerTitle.includes("paper") ||
    lowerTitle.includes("study")
  ) {
    return "research";
  }

  // 默认：应用
  return "application";
}
```

**分类优先级设计：**

```
1. Flair 标签（最准确）
   ↓
2. 教程关键词（用户明确意图）
   ↓
3. 模型关键词（技术核心）
   ↓
4. 工具关键词（开发工具）
   ↓
5. 研究关键词（学术内容）
   ↓
6. 默认：应用（兜底）
```

**为什么这样设计？**

- **Flair 优先**：Reddit 用户手动设置的标签最准确
- **教程优先**：明确的学习意图，用户最关心
- **模型识别**：AI 模型是核心关注点
- **工具识别**：开发者关注实用工具
- **研究兜底**：学术论文单独分类
- **应用默认**：无法确定时归为应用类

### 2. Hacker News 分类

**核心文件**: `src/lib/data-sources/hackernews.ts`

```typescript
function categorizeStory(title: string): NewsCategory {
  const lower = title.toLowerCase();

  // 使用正则匹配 AI 模型名称
  if (/\b(gpt|llama|claude|palm|gemini|mistral)\b/i.test(lower)) {
    return "model";
  }

  // 工具/库
  if (/\b(library|framework|tool|cli|sdk)\b/i.test(lower)) {
    return "tool";
  }

  // 教程
  if (/\b(tutorial|guide|how to|learning|introduction)\b/i.test(lower)) {
    return "tutorial";
  }

  // 研究
  if (/\b(research|paper|arxiv|study|analysis)\b/i.test(lower)) {
    return "research";
  }

  return "application";
}
```

**正则表达式技巧：**

```typescript
// \b: 单词边界
/\bgpt\b/i.test("New GPT model")   // ✅ 匹配
/\bgpt\b/i.test("chatgpt")         // ❌ 不匹配（没有边界）

// i: 忽略大小写
/gpt/i.test("GPT")    // ✅ 匹配
/gpt/.test("GPT")     // ❌ 不匹配

// |: 或运算符
/(gpt|llama|claude)/i.test("GPT-4")   // ✅ 匹配
/(gpt|llama|claude)/i.test("LLaMA")   // ✅ 匹配
```

**为什么 HN 不用 Flair？**

HN 没有标签系统，只能依靠标题关键词匹配。

### 3. arXiv 分类

**核心文件**: `src/lib/data-sources/arxiv.ts`

```typescript
// arXiv 全部归为研究类
function transformArxivPaper(entry: ArxivEntry): NewsItem {
  return {
    // ...
    category: "research",  // 固定分类
    // ...
  };
}
```

**为什么固定为 research？**

arXiv 是学术论文库，所有内容都是研究性质。

### 4. 热度计算算法

#### Reddit 热度

```typescript
popularity: Math.min(100, post.ups / 10 + post.num_comments / 5)
```

**计算示例：**

```
例1: ups=1000, comments=500
→ 1000/10 + 500/5 = 100 + 100 = 200
→ min(100, 200) = 100

例2: ups=50, comments=10
→ 50/10 + 10/5 = 5 + 2 = 7
→ min(100, 7) = 7
```

**权重设计：**
- 点赞权重：1/10（每10个点赞=1分）
- 评论权重：1/5（每5条评论=1分）
- 评论权重更高，因为评论代表更深入的互动

#### Hacker News 热度

```typescript
popularity: Math.min(100, story.score / 10 + (story.descendants || 0) / 5)
```

**HN 特点：**
- `score`: 类似点赞
- `descendants`: 评论总数（包括子评论）

#### arXiv 热度

```typescript
popularity: 50  // 固定值
```

**为什么固定值？**

arXiv 没有点赞和评论系统，无法计算热度，统一给中等分数。

### 5. 数据归一化

**所有热度值归一化到 0-100 区间：**

```typescript
// Math.min 确保不超过 100
popularity: Math.min(100, calculatedValue)
```

**归一化的好处：**
- 便于统一排序
- 便于 UI 展示（进度条、热度标识）
- 避免极端值干扰

## 实际应用场景

### 场景 1：多关键词命中

```typescript
// 标题: "Tutorial: Building AI Tools with GPT-4"

// 匹配到:
// - "tutorial" → tutorial
// - "tool" → tool
// - "gpt" → model

// 根据优先级，返回: tutorial（优先级最高）
```

### 场景 2：Flair 覆盖标题

```typescript
// 标题: "GPT-4 is amazing"
// Flair: "Discussion"

// 标题匹配: model
// Flair 无匹配

// 返回: model（Flair 无明确分类时，使用标题匹配）

// 标题: "Check out this GPT tool"
// Flair: "Tutorial"

// 返回: tutorial（Flair 优先）
```

### 场景 3：热度排序

```typescript
const items = [
  { title: "News 1", popularity: 85 },
  { title: "News 2", popularity: 92 },
  { title: "News 3", popularity: 78 },
];

// 按热度降序排序
items.sort((a, b) => b.popularity - a.popularity);

// 结果: News 2 (92) → News 1 (85) → News 3 (78)
```

## 关键词库

### 模型类

```
gpt, llama, claude, palm, gemini, mistral, model, chatgpt, bard
```

### 应用类

```
app, application, product, service, platform
```

### 教程类

```
tutorial, guide, how to, learn, course, introduction, getting started
```

### 工具类

```
tool, library, framework, api, sdk, cli, package
```

### 研究类

```
research, paper, arxiv, study, analysis, experiment
```

## 优化建议

### 1. 多语言支持

```typescript
// 支持中文关键词
if (
  lowerTitle.includes("教程") ||
  lowerTitle.includes("指南") ||
  lowerTitle.includes("tutorial")
) {
  return "tutorial";
}
```

### 2. 关键词权重

```typescript
// 不同位置的关键词有不同权重
function categorizeWithWeight(title: string): NewsCategory {
  const words = title.toLowerCase().split(" ");

  // 前3个词权重更高
  const highWeightWords = words.slice(0, 3);

  if (highWeightWords.some(w => w.includes("tutorial"))) {
    return "tutorial";
  }

  // 后续词权重较低
  if (words.some(w => w.includes("tutorial"))) {
    // 需要更多证据
  }
}
```

### 3. 机器学习分类

```typescript
// 未来可考虑使用 ML 模型
// - 收集用户手动分类的数据
// - 训练文本分类模型
// - 自动分类 + 关键词作为 fallback
```

## 关键要点

1. **优先级策略**确保最准确的分类（Flair > 教程 > 模型 > 工具 > 研究）
2. **正则表达式**提高匹配准确性（单词边界、忽略大小写）
3. **热度归一化**便于统一排序和展示
4. **权重设计**评论比点赞权重更高（更深入的互动）
5. **兜底策略**无法确定时归为应用类

## 相关文档

- [数据聚合模式](../01-architecture/data-aggregation.md) - 如何处理不同数据源
- [TypeScript 高级实践](../02-frontend/typescript-advanced.md) - NewsCategory 类型定义

## 参考资料

- [正则表达式教程](https://regexr.com/)
- [文本分类算法](https://en.wikipedia.org/wiki/Text_classification)
