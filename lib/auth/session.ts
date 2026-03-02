/**
 * Session Management - JWT-based Authentication
 * 
 * 使用 HMAC-SHA256 签名的 JWT session，防止伪造。
 * 
 * 安全性：
 * - Session token 使用 JWT 格式，包含签名
 * - 验证 exp 过期时间
 * - 验证签名完整性
 * 
 * Edge Runtime 兼容：
 * - 使用 Web Crypto API 而不是 Node.js crypto 模块
 * - 兼容 Next.js middleware (Edge Runtime)
 */
import { cookies } from 'next/headers';

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
 * 将字符串转换为 Uint8Array
 */
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * 将 ArrayBuffer 转换为 base64url 字符串
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * 将 base64url 字符串转换为 Uint8Array
 */
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 使用 Web Crypto API 生成 HMAC-SHA256 签名
 */
async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return arrayBufferToBase64Url(signature);
}

/**
 * 生成 JWT token
 */
export async function signToken(payload: Omit<Session, 'iat' | 'exp'>): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const now = Math.floor(Date.now() / 1000);
  const session: Session = {
    ...payload,
    iat: now,
    exp: now + SESSION_DURATION_HOURS * 3600,
  };
  
  const payloadB64 = btoa(JSON.stringify(session))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const signature = await hmacSha256(`${header}.${payloadB64}`, SECRET);
  
  return `${header}.${payloadB64}.${signature}`;
}

/**
 * 验证 JWT token
 */
export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerB64, payloadB64, signature] = parts;
    
    // 验证签名
    const expectedSignature = await hmacSha256(`${headerB64}.${payloadB64}`, SECRET);
    
    if (signature !== expectedSignature) {
      console.error('[Session] Invalid signature');
      return null;
    }
    
    // 解析 payload
    const payloadBytes = base64UrlToUint8Array(payloadB64);
    const payloadStr = new TextDecoder().decode(payloadBytes);
    const session = JSON.parse(payloadStr) as Session;
    
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
  
  return await verifyToken(sessionToken);
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
