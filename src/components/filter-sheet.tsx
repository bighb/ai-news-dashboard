"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useFilterStore } from "@/stores/filter-store";
import { SOURCE_CONFIG, CATEGORY_CONFIG, NewsSource, NewsCategory } from "@/types";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterSheet({ open, onOpenChange }: FilterSheetProps) {
  const { sources, categories, toggleSource, toggleCategory, resetFilters } = useFilterStore();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>筛选</SheetTitle>
          <SheetDescription>按来源和分类筛选 AI 资讯</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              重置筛选
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">来源</p>
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
              <p className="text-sm font-medium mb-3">分类</p>
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
