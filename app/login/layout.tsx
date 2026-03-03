/**
 * Login Layout - 登录页面布局
 * 
 * 不包含 <html> 和 <body> 标签，因为根布局已在 app/layout.tsx 中定义
 */
export const metadata = {
  title: '登录 - 智能销售助手',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
