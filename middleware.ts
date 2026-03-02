/**
 * Next.js Middleware - Tenant Routing & Authentication Guard
 * 
 * 核心安全中间件：
 * 1. 拦截所有需要认证的请求
 * 2. 验证 JWT session cookie
 * 3. 未认证 → 重定向到 /login
 * 4. 确保没有请求在脱离租户上下文的情况下访问敏感资源
 * 
 * 安全性：
 * - 防止 Broken Access Control (OWASP Top 10 #1)
 * - 强制所有数据库查询在租户隔离下执行
 * - 使用 JWT 签名验证防止 session 伪造
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/session';

/**
 * 不需要认证的公开路径（精确匹配）
 */
const PUBLIC_PATHS = [
  '/',
  '/login',
];

/**
 * 公开 API 路径前缀
 */
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
];

/**
 * 判断路径是否为公开路径
 */
function isPublicPath(pathname: string): boolean {
  // 精确匹配公开路径
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }
  
  // API 路径前缀匹配
  if (PUBLIC_API_PREFIXES.some(prefix => pathname === prefix)) {
    return true;
  }
  
  // Next.js 内部路径
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return true;
  }
  
  return false;
}

/**
 * Middleware 主函数
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. 公开路径直接放行
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  
  // 2. 验证 session cookie（使用 JWT 签名验证）
  const sessionToken = request.cookies.get('session_token')?.value;
  
  if (!sessionToken) {
    return handleUnauthorized(request, pathname);
  }
  
  // 3. 验证 JWT 签名和过期时间
  const session = await verifyToken(sessionToken);
  
  if (!session) {
    return handleUnauthorized(request, pathname);
  }
  
  // 4. 认证通过，放行请求
  return NextResponse.next();
}

/**
 * 处理未认证请求
 */
function handleUnauthorized(request: NextRequest, pathname: string) {
  // API 请求返回 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // 页面请求重定向到登录页
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

/**
 * Matcher 配置
 * 
 * 指定哪些路径会触发此 middleware
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
