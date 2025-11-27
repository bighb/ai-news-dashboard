"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  /**
   * 🎯 QueryClient 实例化的三个关键技巧：
   *
   * 1️⃣ 只解构第一个值 [queryClient]：
   *    - QueryClient 创建后不需要改变，所以省略了 setQueryClient
   *    - 这是一个"只读状态"，符合 QueryClient 的使用场景
   *
   * 2️⃣ 使用箭头函数 () => new QueryClient()：
   *    - 这是惰性初始化（lazy initialization），只在首次渲染时执行
   *    - 如果直接写 new QueryClient()，每次组件渲染都会创建新实例（虽然只用第一个，但很浪费）
   *    - 函数形式告诉 React："只在第一次调用这个函数"
   *
   * 3️⃣ 为什么用 useState 而不是普通变量：
   *    - 普通变量：每次渲染都会创建新实例 → 缓存全部丢失 ❌
   *    - useRef：可行，但语义是"可变引用"，不如 useState 清晰 🟡
   *    - useState：保证跨渲染的实例稳定性，这是官方推荐写法 ✅
   */
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 60, // 1 hour - 数据被视为"新鲜"的时间。在此期间不会重新请求数据
            gcTime: 1000 * 60 * 60 * 2, // 2 hours - 垃圾回收时间。未使用的缓存数据保留在内存中的时间
            refetchOnWindowFocus: false, // 当浏览器窗口重新获得焦点时，不自动重新请求数据
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
