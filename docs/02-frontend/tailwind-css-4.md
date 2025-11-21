# Tailwind CSS 4 新特性

## 概述

Tailwind CSS 4 带来了重大更新：无需单独的配置文件，支持内联主题定义，使用更先进的 OKLCH 色彩空间。项目充分利用了这些新特性构建了灵活的主题系统。

## 核心概念

### 1. @theme inline - 内联主题配置

**核心文件**: `src/app/globals.css`

**Tailwind 3 vs 4 对比：**

```javascript
// ❌ Tailwind 3: 需要单独的 tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6",
      },
    },
  },
};
```

```css
/* ✅ Tailwind 4: 直接在 CSS 中定义 */
@theme inline {
  --color-primary: #3b82f6;
  --color-background: var(--background);

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);

  --animate-accordion-down: accordion-down 0.2s ease-out;
}
```

**优势：**
1. **单一数据源**：CSS 变量和 Tailwind 配置统一
2. **实时生效**：修改 CSS 立即生效，无需重启
3. **动态主题**：可通过 JavaScript 修改 CSS 变量

**PostCSS 配置**：

```javascript
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},  // Tailwind 4 的 PostCSS 插件
  },
};
```

无需 `tailwind.config.js` 文件！

### 2. OKLCH 色彩空间

**核心文件**: `src/app/globals.css`

```css
:root {
  --background: oklch(1 0 0);                    /* 纯白 */
  --foreground: oklch(0.145 0 0);                /* 深灰 */
  --primary: oklch(0.513 0.206 262.881);         /* 蓝色 */
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: oklch(0.132 0 0);              /* 深黑 */
    --foreground: oklch(0.921 0 0);              /* 浅灰 */
    --primary: oklch(0.695 0.191 262.881);       /* 亮蓝 */
  }
}
```

**什么是 OKLCH？**

```
OKLCH = OK + LCH
  L: Lightness (亮度) 0-1
  C: Chroma (色度) 0-0.4
  H: Hue (色相) 0-360°
```

**与 RGB/HSL 的对比：**

| 色彩空间 | 感知均匀性 | 示例 |
|---------|----------|------|
| RGB | ❌ 不均匀 | `rgb(59 130 246)` |
| HSL | ❌ 不均匀 | `hsl(217 91% 60%)` |
| **OKLCH** | ✅ 均匀 | `oklch(0.513 0.206 262.881)` |

**为什么"感知均匀"重要？**

```css
/* HSL: 相同亮度，但视觉不同 */
hsl(0 100% 50%)    /* 红色 - 看起来暗 */
hsl(60 100% 50%)   /* 黄色 - 看起来亮 */
hsl(240 100% 50%)  /* 蓝色 - 看起来很暗 */

/* OKLCH: 相同 L 值，视觉亮度一致 */
oklch(0.5 0.3 0)     /* 红色 */
oklch(0.5 0.3 60)    /* 黄色 */
oklch(0.5 0.3 240)   /* 蓝色 */
/* 👁️ 人眼感知的亮度完全一致！ */
```

**实际应用：**

```css
/* 生成统一的颜色变体 */
--primary: oklch(0.5 0.2 262);
--primary-light: oklch(0.7 0.2 262);   /* 只调整亮度 */
--primary-dark: oklch(0.3 0.2 262);    /* 保持色相和饱和度 */
```

### 3. CSS 变量驱动的主题系统

**核心文件**: `src/app/globals.css`

**完整主题定义：**

```css
:root {
  /* 基础颜色 */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);

  /* 品牌色 */
  --primary: oklch(0.513 0.206 262.881);
  --primary-foreground: oklch(0.989 0 0);

  /* 语义色 */
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.989 0 0);

  /* UI 元素 */
  --card: oklch(1 0 0);
  --border: oklch(0.921 0 0);
  --input: oklch(0.898 0 0);

  /* 圆角 */
  --radius: 0.625rem;
}
```

**在 @theme 中映射：**

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

**在 Tailwind 中使用：**

```typescript
// 自动映射到 Tailwind 类
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground rounded-lg">
    点击
  </button>
</div>
```

**暗色模式：**

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: oklch(0.132 0 0);
    --foreground: oklch(0.921 0 0);
    /* ... 所有颜色反转 ... */
  }
}
```

自动响应系统主题偏好！

### 4. 自定义动画

**核心文件**: `src/app/globals.css`

```css
/* 定义动画 */
@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}

/* 在 @theme 中注册 */
@theme inline {
  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;
}
```

**使用：**

```typescript
<div className="animate-accordion-down">
  展开的内容
</div>
```

### 5. 响应式设计

**核心文件**: `src/components/header.tsx`

```typescript
<header className="
  sticky top-0 z-50
  w-full
  border-b
  bg-background/95
  backdrop-blur
  supports-[backdrop-filter]:bg-background/60
">
  <div className="
    container mx-auto
    flex items-center
    h-14
    px-4 sm:px-6 lg:px-8
  ">
```

**关键技术：**

#### Sticky 头部 + 毛玻璃

```css
sticky top-0        /* 吸顶效果 */
bg-background/95    /* 95% 不透明度 */
backdrop-blur       /* 背景模糊 */
```

#### 渐进增强

```css
supports-[backdrop-filter]:bg-background/60
```

- 如果浏览器支持 `backdrop-filter`，降低不透明度到 60%
- 如果不支持，保持 95%（降级方案）

#### 响应式间距

```css
px-4 sm:px-6 lg:px-8
```

- 默认 (< 640px): `padding-x: 1rem`
- sm (≥ 640px): `padding-x: 1.5rem`
- lg (≥ 1024px): `padding-x: 2rem`

## 实际应用场景

### 场景 1：自定义主题色

```css
:root {
  --primary: oklch(0.5 0.25 142);  /* 绿色主题 */
}
```

所有使用 `bg-primary` 的地方自动更新！

### 场景 2：动态主题切换

```typescript
// JavaScript 动态修改
document.documentElement.style.setProperty(
  "--primary",
  "oklch(0.5 0.25 27)"  // 改为红色
);
```

### 场景 3：响应式卡片

```typescript
<div className="
  w-full
  rounded-lg
  border
  bg-card
  p-4 sm:p-6
  shadow-sm
  hover:shadow-md
  transition-shadow
">
```

## 关键要点

1. **@theme inline** 无需单独配置文件，CSS 即配置
2. **OKLCH** 提供感知均匀的色彩，生成协调的配色方案
3. **CSS 变量** 实现动态主题，支持暗色模式
4. **自定义动画** 可以注册到 Tailwind 并使用类名调用
5. **渐进增强** 使用 `supports-[]` 提供降级方案

## 相关文档

- [Radix UI + CVA](./radix-ui-cva.md) - 如何结合 Radix 组件使用 Tailwind
- [TypeScript 高级实践](./typescript-advanced.md) - 类型安全的 className

## 参考资料

- [Tailwind CSS 4 Beta 文档](https://tailwindcss.com/docs/v4-beta)
- [OKLCH 色彩空间](https://oklch.com/)
