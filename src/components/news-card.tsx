"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewsItem, CATEGORY_CONFIG } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar, Eye, ArrowRight } from "lucide-react";

interface NewsCardProps {
  item: NewsItem;
}

export function NewsCard({ item }: NewsCardProps) {
  const categoryConfig = CATEGORY_CONFIG[item.category];

  // 格式化日期为中文
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return "今天";
    } else if (diffInHours < 48) {
      return "昨天";
    } else {
      return formatDistanceToNow(date, {
        addSuffix: false,
        locale: zhCN,
      });
    }
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg font-semibold leading-tight line-clamp-2 flex-1 group-hover:text-primary">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {item.title}
            </a>
          </CardTitle>
          <Badge
            variant="outline"
            className={`${categoryConfig.color.replace("bg-", "border-")} ${categoryConfig.color.replace("bg-", "text-")} text-xs whitespace-nowrap flex-shrink-0`}
          >
            {categoryConfig.label}
          </Badge>
        </div>

        {/* 日期和阅读量 */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(item.publishedAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{item.popularity}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 描述 */}
        {item.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {item.summary}
          </p>
        )}

        {/* 底部:来源和阅读全文链接 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">来源: {item.sourceName}</span>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline font-medium"
          >
            阅读全文
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
