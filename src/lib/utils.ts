import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 使用 clsx 和 tailwind-merge 将多个 class 值合并为单个字符串。
 *
 * 该工具函数通过以下方式智能合并类名：
 * 1. 使用 clsx 处理条件类、数组和对象
 * 2. 使用 twMerge (tailwind-merge) 解决 Tailwind CSS 类冲突
 *
 * @param inputs - 可变数量的 class 值（字符串、对象、数组等）
 * @returns 解决了 Tailwind 冲突的合并类名字符串
 *
 * @example
 * ```typescript
 * cn('px-2 py-1', 'px-4') // 返回: 'py-1 px-4' (px-4 覆盖 px-2)
 * cn('text-red-500', condition && 'text-blue-500') // 根据条件应用类
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
