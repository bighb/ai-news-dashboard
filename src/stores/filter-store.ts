import { create } from "zustand";
import { FilterSettings, NewsSource, NewsCategory } from "@/types";

// 过滤器状态接口，继承基础配置并添加操作方法
interface FilterState extends FilterSettings {
  toggleSource: (source: NewsSource) => void;
  toggleCategory: (category: NewsCategory) => void;
  setSortBy: (sortBy: "time" | "popularity") => void;
  resetFilters: () => void;
}

// 默认过滤配置
const defaultFilters: FilterSettings = {
  sources: {
    reddit: true,
    hn: true,
    arxiv: true,
  },
  categories: {
    model: true,
    application: true,
    tutorial: true,
    tool: true,
    research: true,
  },
  sortBy: "time",
};

// 创建过滤器状态管理 store
export const useFilterStore = create<FilterState>((set) => ({
  ...defaultFilters,

  // 切换新闻源开关
  toggleSource: (source) =>
    set((state) => ({
      sources: {
        ...state.sources,
        [source]: !state.sources[source],
      },
    })),

  // 切换分类开关
  toggleCategory: (category) =>
    set((state) => ({
      categories: {
        ...state.categories,
        [category]: !state.categories[category],
      },
    })),

  // 设置排序方式
  setSortBy: (sortBy) => set({ sortBy }),

  // 重置为默认配置
  resetFilters: () => set(defaultFilters),
}));
