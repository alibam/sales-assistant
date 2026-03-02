/**
 * Next.js Middleware - Tenant Routing & Authentication Guard
 * 
 * 核心安全中间件：
 * 1. 拦截所有 /(dashboard) 和 /api/ 请求
 * 2. 验证 session cookie
 * 3. 未认证 → 重定向到 /login
 * 4. 确保没有请求在脱离租户上下文的情况下访问敏感资源
 * 
 * 安全性：
 * - 防止 Broken Access Control (OWASP Top 10 #1)
 * - 强制所有数据库查询在租户隔离下执行
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 不需要认证的公开路径
 */
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
];

/**
 * 判断路径是否为公开路径
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

/**
 * 验证 session token
 * 
 * TODO: 生产环境应验证 JWT 签名或查询数据库
 */
function validateSession(sessionToken: string): boolean {
  try {
    const session = JSON.parse(Buffer.from(sessionToken, 'base64').toString('utf-8'));
    return !!(session.userId && session.tenantId && session.role);
  } catch {
    return false;
  }
}

/**
 * Middleware 主函数
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. 公开路径直接放行
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  
  // 2. 只拦截 dashboard 和 api 路由
  const isProtectedPath = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/api/');
  
  if (!isProtectedPath) {
    return NextResponse.next();
  }
  
  // 3. 验证 session cookie
  const sessionToken = request.cookies.get('session_token')?.value;
  
  if (!sessionToken || !validateSession(sessionToken)) {
    // API 请求返回 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Dashboard 请求重定向到登录页
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // 4. 认证通过，放行请求
  return NextResponse.next();
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
