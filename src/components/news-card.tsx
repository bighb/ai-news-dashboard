"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewsItem, SOURCE_CONFIG, CATEGORY_CONFIG } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface NewsCardProps {
  item: NewsItem;
}

export function NewsCard({ item }: NewsCardProps) {
  const sourceConfig = SOURCE_CONFIG[item.source];
  const categoryConfig = CATEGORY_CONFIG[item.category];

  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium leading-tight line-clamp-2 group-hover:text-primary">
              {item.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="secondary"
              className={`${sourceConfig.color} text-white text-xs`}
            >
              {sourceConfig.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {categoryConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {item.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {item.summary}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{item.sourceName}</span>
            <div className="flex items-center gap-3">
              {item.metadata.upvotes !== undefined && (
                <span>{item.metadata.upvotes} upvotes</span>
              )}
              {item.metadata.comments !== undefined && (
                <span>{item.metadata.comments} comments</span>
              )}
              <span>
                {formatDistanceToNow(new Date(item.publishedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </a>
    </Card>
  );
}
