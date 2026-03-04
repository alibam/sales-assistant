/**
 * Mock Login API - 快速闭环认证模拟
 * 
 * ⚠️ 仅用于本地开发测试，生产环境必须替换为：
 * - NextAuth / Auth0 / Clerk 等
 * - OAuth 2.0 + JWT
 * - 数据库 session 存储
 * 
 * 安全限制：
 * - 仅在 NODE_ENV=development 时可用
 * - 生产环境会返回 403
 */
import { NextRequest, NextResponse } from 'next/server';
import { Session, signToken } from '@/lib/auth/session';
import { TEST_USERS } from '@/lib/db/fixtures';

// Mock 用户数据库（生产环境应查询真实数据库）
// 使用 Type-Safe Fixtures 确保数据符合 Prisma Schema 约束
const MOCK_USERS: Record<string, Omit<Session, 'iat' | 'exp'>> = {
  'demo-user': TEST_USERS.DEMO_SALES_REP,
  'manager-user': TEST_USERS.DEMO_SALES_MANAGER,
  'admin-user': TEST_USERS.DEMO_TENANT_ADMIN,
};

/**
 * POST /api/auth/login
 * 
 * Mock 登录接口，用于测试
 * 
 * Request Body:
 * {
 *   "username": "demo-user" | "manager-user" | "admin-user"
 * }
 * 
 * Response:
 * - Set-Cookie: session_token (HTTP-only, JWT signed)
 * - 200: { success: true, session: {...} }
 * - 401: { error: "Invalid credentials" }
 * - 403: { error: "Mock login disabled in production" }
 * 
 * 安全配置：
 * - 生产环境默认禁止 mock 登录
 * - 设置 ENABLE_MOCK_LOGIN=true 可强制启用（仅用于演示/测试）
 */
export async function POST(request: NextRequest) {
  // 生产环境安全检查
  if (process.env.NODE_ENV === 'production') {
    // 只有显式启用 ENABLE_MOCK_LOGIN=true 才允许 mock 登录
    // ⚠️ 警告：这仅用于演示/测试环境，生产环境应使用真实认证
    if (process.env.ENABLE_MOCK_LOGIN !== 'true') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Mock login is disabled in production. Set ENABLE_MOCK_LOGIN=true to enable for demo.' },
        { status: 403 }
      );
    }
    console.warn('[SECURITY] Mock login enabled in production mode - FOR DEMO ONLY');
  }
  
  try {
    const body = await request.json();
    const { username } = body;
    
    // 验证用户名
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }
    
    // 查找 mock 用户
    const userSession = MOCK_USERS[username];
    
    if (!userSession) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // 生成 JWT session token（带签名）
    const sessionToken = await signToken(userSession);
    
    // 创建响应并设置 HTTP-only Cookie
    const response = NextResponse.json({
      success: true,
      session: {
        userId: userSession.userId,
        tenantId: userSession.tenantId,
        role: userSession.role,
      },
    });
    
    // 设置 Cookie（HTTP-only, Secure in production）
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('[Login API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/logout
 * 
 * 登出接口，清除 session cookie
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  
  response.cookies.set('session_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // 立即过期
    path: '/',
  });
  
  return response;
}
