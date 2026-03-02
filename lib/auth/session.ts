/**
 * Session Management - JWT-based Authentication
 * 
 * 使用 HMAC-SHA256 签名的 JWT session，防止伪造。
 * 
 * 安全性：
 * - Session token 使用 JWT 格式，包含签名
 * - 验证 exp 过期时间
 * - 验证签名完整性
 */
import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface Session {
  userId: string;
  tenantId: string;
  role: 'SALES_REP' | 'SALES_MANAGER' | 'TENANT_ADMIN';
  iat: number; // issued at
  exp: number; // expiration
}

const JWT_SECRET = process.env.JWT_SECRET;

// 生产环境必须配置 JWT_SECRET
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY] JWT_SECRET environment variable is required in production');
  }
  // 开发环境使用临时密钥
  console.warn('[SECURITY] Using temporary JWT_SECRET for development only');
}

const DEV_JWT_SECRET = 'dev-secret-change-in-production';
const SECRET = JWT_SECRET || DEV_JWT_SECRET;
const SESSION_DURATION_HOURS = 24 * 7; // 7 days

/**
 * 生成 JWT token
 */
export function signToken(payload: Omit<Session, 'iat' | 'exp'>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const session: Session = {
    ...payload,
    iat: now,
    exp: now + SESSION_DURATION_HOURS * 3600,
  };
  const payloadB64 = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${payloadB64}`)
    .digest('base64url');
  
  return `${header}.${payloadB64}.${signature}`;
}

/**
 * 验证 JWT token
 */
export function verifyToken(token: string): Session | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerB64, payloadB64, signature] = parts;
    
    // 验证签名
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      console.error('[Session] Invalid signature');
      return null;
    }
    
    // 解析 payload
    const session = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as Session;
    
    // 验证字段完整性
    if (!session.userId || !session.tenantId || !session.role || !session.exp || !session.iat) {
      console.error('[Session] Missing required fields');
      return null;
    }
    
    // 验证 role 枚举
    const validRoles = ['SALES_REP', 'SALES_MANAGER', 'TENANT_ADMIN'];
    if (!validRoles.includes(session.role)) {
      console.error('[Session] Invalid role:', session.role);
      return null;
    }
    
    // 验证过期时间
    const now = Math.floor(Date.now() / 1000);
    if (session.exp < now) {
      console.error('[Session] Token expired');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('[Session] Token verification failed:', error);
    return null;
  }
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
  
  return verifyToken(sessionToken);
}

/**
 * Auth Error - 专用认证错误类型
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * 获取当前用户的 tenantId
 * 
 * @throws AuthError 如果未认证
 * @returns tenantId
 */
export async function getTenantId(): Promise<string> {
  const session = await getSession();
  
  if (!session) {
    throw new AuthError('Unauthorized: No valid session');
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
 * @throws AuthError 如果未认证
 * @returns Session 对象
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  
  if (!session) {
    throw new AuthError('Unauthorized: Authentication required');
  }
  
  return session;
}
