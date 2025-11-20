"use client";

import { useQuery } from "@tanstack/react-query";
import { NewsCard } from "./news-card";
import { useFilterStore } from "@/stores/filter-store";
import { AggregateResponse, NewsItem } from "@/types";

async function fetchNews(): Promise<AggregateResponse> {
  const response = await fetch("/api/aggregate");
  if (!response.ok) {
    throw new Error("Failed to fetch news");
  }
  return response.json();
}

export function NewsGrid() {
  const { sources, categories, sortBy } = useFilterStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["news"],
    queryFn: fetchNews,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading news...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-destructive">
          <p>Failed to load news</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  if (!data?.items) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No news available</p>
      </div>
    );
  }

  // Filter items
  let filteredItems = data.items.filter((item) => {
    const sourceMatch = sources[item.source];
    const categoryMatch = categories[item.category];
    return sourceMatch && categoryMatch;
  });

  // Sort items
  if (sortBy === "popularity") {
    filteredItems = [...filteredItems].sort(
      (a, b) => b.popularity - a.popularity
    );
  } else {
    filteredItems = [...filteredItems].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">
          No news matches your filters. Try adjusting your filter settings.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredItems.map((item: NewsItem) => (
        <NewsCard key={`${item.source}-${item.id}`} item={item} />
      ))}
    </div>
  );
}
