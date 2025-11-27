import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 新闻仪表板",
  description: "聚合来自 Reddit、Hacker News 和 arXiv 的 AI 新闻",
};

/**
 * 应用程序的根布局组件
 *
 * 该组件作为 Next.js 应用程序中所有页面的顶层布局包装器。
 * 它设置基本的 HTML 结构,应用全局字体变量,并使用 Providers 组件包装所有子组件
 * 以实现上下文/状态管理。
 *
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 在布局中渲染的子组件
 * @returns {JSX.Element} 配置了字体和 providers 的根 HTML 结构
 *
 * @example
 * ```tsx
 * // 此布局由 Next.js App Router 自动应用于 app 目录中的所有页面
 * ```
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
