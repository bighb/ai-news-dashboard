"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterStore } from "@/stores/filter-store";
import { SOURCE_CONFIG, CATEGORY_CONFIG, NewsSource, NewsCategory } from "@/types";

export function FilterBar() {
  const { sources, categories, sortBy, toggleSource, toggleCategory, setSortBy, resetFilters } =
    useFilterStore();

  return (
    <div className="flex flex-col gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Filters</h2>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          Reset
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Sources</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SOURCE_CONFIG) as NewsSource[]).map((source) => (
              <Badge
                key={source}
                variant={sources[source] ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleSource(source)}
              >
                {SOURCE_CONFIG[source].label}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs text-muted-foreground mb-2">Categories</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_CONFIG) as NewsCategory[]).map((category) => (
              <Badge
                key={category}
                variant={categories[category] ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleCategory(category)}
              >
                {CATEGORY_CONFIG[category].label}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs text-muted-foreground mb-2">Sort by</p>
          <Select value={sortBy} onValueChange={(value: "time" | "popularity") => setSortBy(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Latest</SelectItem>
              <SelectItem value="popularity">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
