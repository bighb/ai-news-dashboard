import { create } from "zustand";
import { FilterSettings, NewsSource, NewsCategory } from "@/types";

interface FilterState extends FilterSettings {
  toggleSource: (source: NewsSource) => void;
  toggleCategory: (category: NewsCategory) => void;
  setSortBy: (sortBy: "time" | "popularity") => void;
  resetFilters: () => void;
}

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

export const useFilterStore = create<FilterState>((set) => ({
  ...defaultFilters,

  toggleSource: (source) =>
    set((state) => ({
      sources: {
        ...state.sources,
        [source]: !state.sources[source],
      },
    })),

  toggleCategory: (category) =>
    set((state) => ({
      categories: {
        ...state.categories,
        [category]: !state.categories[category],
      },
    })),

  setSortBy: (sortBy) => set({ sortBy }),

  resetFilters: () => set(defaultFilters),
}));
