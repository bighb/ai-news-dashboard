# 日期与国际化

## 概述

项目使用 date-fns 库处理时间格式化，提供友好的相对时间显示和中文本地化支持。相比传统的 Moment.js，date-fns 更轻量、更现代。

## 核心概念

### 1. date-fns 时间处理

**核心文件**: `src/components/news-card.tsx`

```typescript
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  // 24小时内显示"今天"
  if (diffInHours < 24) {
    return "今天";
  }

  // 48小时内显示"昨天"
  else if (diffInHours < 48) {
    return "昨天";
  }

  // 其他显示相对时间
  else {
    return formatDistanceToNow(date, {
      addSuffix: true,      // 添加"前"后缀
      locale: zhCN,         // 中文本地化
    }) + "前";
  }
}
```

**示例输出：**

```typescript
formatDate("2025-11-21T10:00:00Z")  // "今天"
formatDate("2025-11-20T10:00:00Z")  // "昨天"
formatDate("2025-11-15T10:00:00Z")  // "6天前"
formatDate("2025-10-21T10:00:00Z")  // "约1个月前"
formatDate("2024-11-21T10:00:00Z")  // "1年前"
```

### 2. 为什么用 date-fns？

**对比 Moment.js：**

| 特性 | Moment.js | date-fns |
|------|-----------|----------|
| Bundle 大小 | ~230KB | ~13KB (tree-shakable) |
| 可变性 | ❌ 可变（危险） | ✅ 不可变（安全） |
| 模块化 | ❌ 整体导入 | ✅ 按需导入 |
| 维护状态 | ⚠️ 进入维护模式 | ✅ 活跃开发 |
| TypeScript | 需配置 | 开箱即用 |

**不可变性示例：**

```javascript
// ❌ Moment.js（可变）
const date = moment();
date.add(1, 'day');  // 修改了原对象！
console.log(date);   // 已改变

// ✅ date-fns（不可变）
const date = new Date();
const tomorrow = addDays(date, 1);  // 返回新对象
console.log(date);      // 未改变
console.log(tomorrow);  // 新日期
```

### 3. 中文本地化

**核心文件**: `src/components/news-card.tsx`

```typescript
import { zhCN } from "date-fns/locale";

formatDistanceToNow(date, {
  locale: zhCN,         // 中文本地化
  addSuffix: true,      // 添加"...前"后缀
});
```

**本地化内容：**

```
英文（默认）:       中文（zhCN）:
about 1 hour       约1小时
2 days             2天
3 months           3个月
1 year             1年
about 2 years      约2年
```

**完整的相对时间表：**

| 时间差 | 显示 |
|--------|------|
| < 1分钟 | 不到1分钟 |
| 1-59分钟 | X分钟 |
| 1-23小时 | 约X小时 |
| 1天 | 1天 |
| 2-29天 | X天 |
| 1-11月 | 约X个月 |
| 1年+ | 约X年 |

### 4. 自定义时间格式

**date-fns 提供丰富的格式化函数：**

```typescript
import { format, formatDistance, formatRelative } from "date-fns";
import { zhCN } from "date-fns/locale";

const date = new Date();

// 标准格式化
format(date, "yyyy-MM-dd");              // "2025-11-21"
format(date, "yyyy年MM月dd日");          // "2025年11月21日"
format(date, "HH:mm:ss");                // "14:30:00"

// 相对时间（两个日期之间）
formatDistance(date, futureDate, {
  locale: zhCN,
});                                      // "约3天"

// 相对描述
formatRelative(date, new Date(), {
  locale: zhCN,
});                                      // "今天 14:30"
```

### 5. 时区处理

**date-fns-tz 扩展库：**

```typescript
import { formatInTimeZone } from "date-fns-tz";

// 转换时区
formatInTimeZone(
  date,
  "Asia/Shanghai",
  "yyyy-MM-dd HH:mm:ss"
);  // 北京时间

formatInTimeZone(
  date,
  "America/New_York",
  "yyyy-MM-dd HH:mm:ss"
);  // 纽约时间
```

## 实际应用场景

### 场景 1：新闻卡片时间显示

```typescript
function NewsCard({ item }: { item: NewsItem }) {
  const timeText = formatDate(item.publishedAt);

  return (
    <div>
      <h3>{item.title}</h3>
      <span className="text-xs text-muted-foreground">
        {timeText}
      </span>
    </div>
  );
}
```

**用户体验：**
- 今天发布的：显示"今天"（简洁）
- 昨天发布的：显示"昨天"（清晰）
- 更早的：显示"3天前"、"1周前"（直观）

### 场景 2：评论时间戳

```typescript
function Comment({ createdAt }) {
  return (
    <div>
      <span>
        {formatDistanceToNow(new Date(createdAt), {
          locale: zhCN,
          addSuffix: true,
        })}
      </span>
    </div>
  );
}

// 输出: "5分钟前"、"2小时前"、"3天前"
```

### 场景 3：绝对时间 + 相对时间

```typescript
function DateDisplay({ date }) {
  const absolute = format(new Date(date), "yyyy年MM月dd日 HH:mm");
  const relative = formatDistanceToNow(new Date(date), {
    locale: zhCN,
    addSuffix: true,
  });

  return (
    <time dateTime={date} title={absolute}>
      {relative}
    </time>
  );
}

// 显示: "2天前"
// 鼠标悬停: "2025年11月19日 14:30"
```

## 常用函数速查

```typescript
import {
  format,               // 格式化日期
  formatDistance,       // 相对时间（两个日期）
  formatDistanceToNow,  // 相对时间（到现在）
  formatRelative,       // 相对描述
  addDays,             // 加天数
  subDays,             // 减天数
  differenceInDays,    // 计算天数差
  isAfter,             // 是否在之后
  isBefore,            // 是否在之前
  parseISO,            // 解析 ISO 字符串
} from "date-fns";

import { zhCN } from "date-fns/locale";
```

## 关键要点

1. **date-fns** 比 Moment.js 更轻量、更现代、更安全
2. **不可变性** 避免意外修改日期对象
3. **按需导入** 只打包使用的函数，减小 bundle
4. **中文本地化** 使用 `zhCN` locale 提供友好的中文显示
5. **相对时间** 比绝对时间更直观，提升用户体验

## 相关文档

- [TypeScript 高级实践](../02-frontend/typescript-advanced.md) - 日期类型定义
- [性能优化技巧](../02-frontend/performance-optimization.md) - tree-shaking 优化

## 参考资料

- [date-fns 官方文档](https://date-fns.org/)
- [date-fns 中文文档](https://date-fns.org/docs/I18n)
- [date-fns-tz 时区支持](https://github.com/marnusw/date-fns-tz)
