# Radix UI + CVA 组件设计

## 概述

Radix UI 是一个无样式的可访问 UI 组件库，CVA (Class Variance Authority) 则提供类型安全的样式变体管理。两者结合，形成了 shadcn/ui 的核心设计理念：行为和样式完全分离。

## 核心概念

### 1. Radix UI - 无样式组件库

**什么是"无样式"？**
- Radix 只提供组件的**行为**和**可访问性**
- 不包含任何 CSS 样式
- 你可以用任何方式（Tailwind、CSS Modules、styled-components）添加样式

**核心文件**: `src/components/filter-sheet.tsx`

```typescript
import * as Dialog from "@radix-ui/react-dialog";

function FilterSheet({ open, onOpenChange }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {/* 触发器 */}
      <Dialog.Trigger asChild>
        <Button>打开筛选</Button>
      </Dialog.Trigger>

      {/* Portal: 渲染到 <body> */}
      <Dialog.Portal>
        {/* 遮罩层 */}
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />

        {/* 内容 */}
        <Dialog.Content className="fixed right-0 top-0 h-full w-3/4 bg-white">
          <Dialog.Title>筛选器</Dialog.Title>
          <Dialog.Close asChild>
            <Button>关闭</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**关键特性：**

#### Compound Components（复合组件模式）

```typescript
// ❌ 传统方式：通过 props 配置
<Dialog
  open={open}
  title="筛选器"
  content={<div>...</div>}
/>

// ✅ Radix 方式：组合子组件
<Dialog.Root open={open}>
  <Dialog.Title>筛选器</Dialog.Title>
  <Dialog.Content>
    {/* 自定义内容 */}
  </Dialog.Content>
</Dialog.Root>
```

优势：更灵活、结构更清晰、更容易自定义

#### Portal（传送门）

```typescript
<Dialog.Portal>
  <Dialog.Overlay />
  <Dialog.Content />
</Dialog.Portal>
```

**作用**：将元素渲染到 `<body>` 末尾，避免 `z-index` 和 `overflow` 问题

**自动可访问性：**

Radix 自动添加 ARIA 属性：
```html
<button
  aria-haspopup="dialog"
  aria-expanded="true"
  aria-controls="radix-:r1:"
>
  打开筛选
</button>

<div
  role="dialog"
  aria-labelledby="radix-:r2:"
  aria-modal="true"
>
  <h2 id="radix-:r2:">筛选器</h2>
</div>
```

**键盘导航：**
- `Esc`: 关闭弹窗
- `Tab`: 焦点陷阱（Focus Trap）
- 自动聚焦第一个可交互元素

### 2. CVA - 类型安全的样式变体

**核心文件**: `src/components/ui/button.tsx`

```typescript
import { cva, type VariantProps } from "class-variance-authority";

// 定义样式变体
const buttonVariants = cva(
  // 基础样式（始终应用）
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",

  // 变体配置
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// 提取类型
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// 使用
function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

**使用示例：**

```typescript
// ✅ 类型安全
<Button variant="default" size="sm">点击</Button>
<Button variant="destructive">删除</Button>

// ❌ 类型错误（TypeScript 会报错）
<Button variant="invalid" />
```

**为什么用 CVA？**

传统方式的问题：
```typescript
// ❌ 手动拼接类名，容易出错
const buttonClass = `
  ${base}
  ${variant === "primary" ? "bg-blue" : "bg-gray"}
  ${size === "sm" ? "text-sm" : "text-base"}
`;
```

CVA 的优势：
```typescript
// ✅ 类型安全 + 自动组合
const buttonClass = buttonVariants({ variant, size });
```

### 3. Slot 模式（asChild）

**核心文件**: `src/components/ui/button.tsx`

解决组件嵌套的问题：

```typescript
import { Slot } from "@radix-ui/react-slot";

function Button({ asChild, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp {...props} />;
}
```

**使用场景：**

```typescript
// ❌ 传统方式：不符合 HTML 规范
<Button>
  <Link href="/home">首页</Link>
</Button>
// 渲染为: <button><a href="/home">首页</a></button>

// ✅ Slot 方式
<Button asChild>
  <Link href="/home">首页</Link>
</Button>
// 渲染为: <a href="/home" className="按钮样式">首页</a>
```

**原理**：Slot 会合并 props（className、onClick 等）到子元素

## 实际应用场景

### 场景 1：可访问的弹窗

```typescript
<Dialog.Root>
  <Dialog.Trigger asChild>
    <Button>打开设置</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>设置</Dialog.Title>
      {/* 内容 */}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

自动实现：
- ✅ 键盘导航
- ✅ 屏幕阅读器支持
- ✅ 焦点管理
- ✅ ARIA 属性

### 场景 2：多变体按钮

```typescript
// 主按钮
<Button variant="default">保存</Button>

// 危险操作
<Button variant="destructive">删除</Button>

// 次要操作
<Button variant="outline">取消</Button>

// 小尺寸
<Button size="sm">编辑</Button>
```

### 场景 3：自定义主题

```typescript
// 扩展现有变体
const buttonVariants = cva("...", {
  variants: {
    variant: {
      // 添加新变体
      success: "bg-green-500 text-white hover:bg-green-600",
    },
  },
});

// 使用
<Button variant="success">成功</Button>
```

## 关键要点

1. **Radix UI** 只提供行为，不提供样式，完全可定制
2. **CVA** 提供类型安全的样式管理，避免手动拼接类名
3. **Compound Components** 模式提供灵活的组件组合
4. **Portal** 解决层级和定位问题
5. **Slot** 模式实现无包装的组件组合

## 相关文档

- [Tailwind CSS 4](./tailwind-css-4.md) - 如何用 Tailwind 为 Radix 添加样式
- [TypeScript 高级实践](./typescript-advanced.md) - VariantProps 类型推导

## 参考资料

- [Radix UI 文档](https://www.radix-ui.com/)
- [CVA GitHub](https://github.com/joe-bell/cva)
- [shadcn/ui](https://ui.shadcn.com/) - 基于 Radix + CVA 的组件库
