/**
 * Session Management - Mock Authentication Layer
 * 
 * 轻量级会话模拟层，用于 Milestone 5 快速闭环。
 * 生产环境应替换为 NextAuth 或其他认证方案。
 * 
 * 安全性：
 * - 从 HTTP-only Cookie 读取 session token
 * - Session 包含 userId 和 tenantId
 * - 所有敏感路由必须验证 session
 */
import { cookies } from 'next/headers';

export interface Session {
  userId: string;
  tenantId: string;
  role: 'SALES_REP' | 'SALES_MANAGER' | 'TENANT_ADMIN';
}

/**
 * 从 Request Cookies 获取当前会话
 * 
 * @returns Session 对象，如果未认证则返回 null
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  
  if (!sessionToken) {
    return null;
  }
  
  // TODO: 生产环境应该验证 JWT 或查询数据库
  // 当前为 Mock 实现，从 Cookie 值解析 session
  try {
    const session = JSON.parse(Buffer.from(sessionToken, 'base64').toString('utf-8'));
    
    // 验证 session 结构
    if (!session.userId || !session.tenantId || !session.role) {
      return null;
    }
    
    return session as Session;
  } catch (error) {
    console.error('[Session] Parse failed:', error);
    return null;
  }
}

/**
 * 获取当前用户的 tenantId
 * 
 * @throws Error 如果未认证
 * @returns tenantId
 */
export async function getTenantId(): Promise<string> {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Unauthorized: No valid session');
  }
  
  return session.tenantId;
}

/**
 * 获取当前用户的 userId
 * 
 * @throws Error 如果未认证
 * @returns userId
 */
export async function getUserId(): Promise<string> {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Unauthorized: No valid session');
  }
  
  return session.userId;
}

/**
 * 要求用户必须已认证，否则抛出错误
 * 
 * @throws Error 如果未认证
 * @returns Session 对象
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Unauthorized: Authentication required');
  }
  
  return session;
}
