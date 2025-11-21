# AI News Dashboard - 技术文档

欢迎来到 AI News Dashboard 项目的技术文档！本文档旨在帮助新手理解项目中使用的核心技术和设计模式。

## 项目技术栈

- **框架**: Next.js 16 (App Router) + React 19
- **状态管理**: Zustand 5 + TanStack Query 5
- **样式**: Tailwind CSS 4 + Radix UI
- **语言**: TypeScript 5 (严格模式)
- **包管理**: pnpm

## 文档导航

### 📐 核心架构

这部分介绍项目的核心架构设计，解释为什么这样设计以及解决了什么问题。

1. [**Next.js 16 高级特性**](./01-architecture/nextjs-advanced.md)
   - 路由段配置 (dynamic, runtime, revalidate)
   - Instrumentation Hook 应用初始化
   - ISR 增量静态再生成

2. [**网络代理架构**](./01-architecture/proxy-architecture.md)
   - undici ProxyAgent 显式代理
   - global-agent 全局代理
   - 请求重试与超时控制

3. [**数据聚合模式**](./01-architecture/data-aggregation.md)
   - Promise.allSettled 并行请求
   - 优雅降级策略
   - 多数据源适配器设计

4. [**状态管理方案**](./01-architecture/state-management.md)
   - Zustand 轻量级状态管理
   - React Query 数据缓存策略
   - 双层缓存协同

### 🎨 前端技术

这部分介绍前端开发中的关键技术，重点讲解如何使用和最佳实践。

5. [**Radix UI + CVA 组件设计**](./02-frontend/radix-ui-cva.md)
   - Radix UI 无样式组件库
   - CVA 类型安全的样式变体
   - Slot 模式与组件组合

6. [**Tailwind CSS 4 新特性**](./02-frontend/tailwind-css-4.md)
   - @theme inline 内联主题配置
   - OKLCH 色彩空间
   - CSS 变量驱动的主题系统

7. [**TypeScript 高级实践**](./02-frontend/typescript-advanced.md)
   - 类型别名 vs 接口
   - Record 类型与泛型推导
   - 自定义类型声明 (.d.ts)

8. [**性能优化技巧**](./02-frontend/performance-optimization.md)
   - ISR 缓存策略
   - React Query 缓存配置
   - 请求并行化与代码分割

### 🔧 实现细节

这部分介绍具体功能的实现细节，包括算法和实战技巧。

9. [**日期与国际化**](./03-implementation/date-i18n.md)
   - date-fns 时间格式化
   - 中文本地化配置
   - 相对时间显示

10. [**错误处理与日志**](./03-implementation/error-handling.md)
    - 优雅降级设计
    - 结构化日志策略
    - 错误边界处理

11. [**智能分类算法**](./03-implementation/classification-algorithm.md)
    - 关键词匹配分类
    - 热度计算算法
    - 数据归一化处理

## 学习路径建议

### 快速入门 (1-2天)
建议按以下顺序学习核心概念：
1. Next.js 16 高级特性
2. 状态管理方案
3. Radix UI + CVA
4. TypeScript 高级实践

### 深入理解 (3-5天)
在掌握基础后，深入学习：
1. 网络代理架构
2. 数据聚合模式
3. 性能优化技巧
4. 错误处理与日志

### 实战应用 (1周+)
将知识应用到实际开发：
1. 参考智能分类算法实现自己的分类逻辑
2. 基于现有架构添加新的数据源
3. 优化性能和用户体验
4. 完善错误处理和日志系统

## 相关资源

- [项目 README](../README.md) - 项目概述和快速开始
- [Next.js 官方文档](https://nextjs.org/docs)
- [Radix UI 文档](https://www.radix-ui.com/)
- [TanStack Query 文档](https://tanstack.com/query/latest)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)

## 贡献文档

如果你发现文档中的错误或有改进建议，欢迎提交 Issue 或 Pull Request！

---

最后更新: 2025-11-21
