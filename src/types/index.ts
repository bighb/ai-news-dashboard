// 资讯来源类型
export type NewsSource = "reddit" | "hn" | "arxiv";

// 内容分类类型
export type NewsCategory = "model" | "application" | "tutorial" | "tool" | "research";

// 统一的资讯条目接口
export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  url: string;
  source: NewsSource;
  sourceName: string;
  category: NewsCategory;
  publishedAt: string;
  popularity: number;
  metadata: {
    likes?: number;
    comments?: number;
    upvotes?: number;
    author?: string;
    subreddit?: string;
  };
}

// 筛选设置
export interface FilterSettings {
  sources: {
    [key in NewsSource]: boolean;
  };
  categories: {
    [key in NewsCategory]: boolean;
  };
  sortBy: "time" | "popularity";
}

// API 响应类型
export interface AggregateResponse {
  items: NewsItem[];
  fetchedAt: string;
  errors?: string[];
}

// 来源配置
export const SOURCE_CONFIG: Record<NewsSource, { label: string; color: string }> = {
  reddit: { label: "Reddit", color: "bg-orange-500" },
  hn: { label: "Hacker News", color: "bg-orange-600" },
  arxiv: { label: "arXiv", color: "bg-red-500" },
};

// 分类配置
export const CATEGORY_CONFIG: Record<NewsCategory, { label: string; color: string }> = {
  model: { label: "New Model", color: "bg-purple-500" },
  application: { label: "Application", color: "bg-blue-500" },
  tutorial: { label: "Tutorial", color: "bg-green-500" },
  tool: { label: "Tool", color: "bg-yellow-500" },
  research: { label: "Research", color: "bg-pink-500" },
};
