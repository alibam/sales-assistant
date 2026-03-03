/**
 * Root Layout - 全局根布局
 * 
 * Next.js App Router 需要根布局包含 <html> 和 <body> 标签
 */
export const metadata = {
  title: '智能销售助手',
  description: 'AI-Powered Sales Lifecycle Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
