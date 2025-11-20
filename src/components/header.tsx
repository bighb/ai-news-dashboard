"use client";

import { Button } from "@/components/ui/button";
import { useFilterStore } from "@/stores/filter-store";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { FilterSheet } from "./filter-sheet";

export function Header() {
  const { sortBy, setSortBy } = useFilterStore();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-3/4 mx-auto px-4 flex h-14 items-center justify-between">
        {/* 左侧标签切换 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy("time")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              sortBy === "time"
                ? "bg-foreground text-background"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            最新
          </button>
          <button
            onClick={() => setSortBy("popularity")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              sortBy === "popularity"
                ? "bg-foreground text-background"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            热门
          </button>
        </div>

        {/* 右侧筛选按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFilterOpen(true)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          筛选
        </Button>
      </div>

      {/* 筛选弹窗 */}
      <FilterSheet open={isFilterOpen} onOpenChange={setIsFilterOpen} />
    </header>
  );
}
