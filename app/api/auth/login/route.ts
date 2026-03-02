/**
 * Mock Login API - 快速闭环认证模拟
 * 
 * 生产环境应替换为：
 * - NextAuth / Auth0 / Clerk 等
 * - OAuth 2.0 + JWT
 * - 数据库 session 存储
 */
import { NextRequest, NextResponse } from 'next/server';
import { Session } from '@/lib/auth/session';

// Mock 用户数据库（生产环境应查询真实数据库）
const MOCK_USERS: Record<string, Session> = {
  'demo-user': {
    userId: 'demo-user-id',
    tenantId: 'demo-tenant-id',
    role: 'SALES_REP',
  },
  'manager-user': {
    userId: 'manager-user-id',
    tenantId: 'demo-tenant-id',
    role: 'SALES_MANAGER',
  },
  'admin-user': {
    userId: 'admin-user-id',
    tenantId: 'admin-tenant-id',
    role: 'TENANT_ADMIN',
  },
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
 * - Set-Cookie: session_token (HTTP-only)
 * - 200: { success: true, session: {...} }
 * - 401: { error: "Invalid credentials" }
 */
export async function POST(request: NextRequest) {
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
    const session = MOCK_USERS[username];
    
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // 生成 session token（生产环境应使用 JWT）
    const sessionToken = Buffer.from(JSON.stringify(session)).toString('base64');
    
    // 创建响应并设置 HTTP-only Cookie
    const response = NextResponse.json({
      success: true,
      session: {
        userId: session.userId,
        tenantId: session.tenantId,
        role: session.role,
      },
    });
    
    // 设置 Cookie（7 天过期）
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
    sameSite: 'lax',
    maxAge: 0, // 立即过期
    path: '/',
  });
  
  return response;
}
