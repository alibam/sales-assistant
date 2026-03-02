/**
 * Login Page - 登录页面
 * 
 * Mock 登录界面，用于快速闭环测试。
 * 生产环境应替换为：
 * - OAuth 登录按钮
 * - 用户名/密码表单
 * - 密码重置功能
 */
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const DEMO_USERS = [
  { username: 'demo-user', label: 'Demo Sales Rep', role: 'SALES_REP' },
  { username: 'manager-user', label: 'Demo Manager', role: 'SALES_MANAGER' },
  { username: 'admin-user', label: 'Demo Admin', role: 'TENANT_ADMIN' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  async function handleLogin(username: string) {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // 登录成功，重定向到目标页面
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleLogout() {
    await fetch('/api/auth/login', { method: 'DELETE' });
    router.refresh();
  }
  
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
    }}>
      <div style={{
        background: '#ffffff',
        padding: '48px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          🔐 Sales Assistant
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          marginBottom: '32px',
          textAlign: 'center',
        }}>
          Mock Login (Milestone 5)
        </p>
        
        {error && (
          <div style={{
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '8px',
            marginBottom: '24px',
            color: '#dc2626',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {DEMO_USERS.map(user => (
            <button
              key={user.username}
              onClick={() => handleLogin(user.username)}
              disabled={isLoading}
              style={{
                padding: '16px',
                background: isLoading ? '#e2e8f0' : '#2563eb',
                color: isLoading ? '#94a3b8' : '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {isLoading ? 'Logging in...' : `${user.label} (${user.role})`}
            </button>
          ))}
        </div>
        
        <div style={{
          marginTop: '32px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#64748b',
        }}>
          <strong>⚠️ 安全提示：</strong>
          <br />
          这是 Mock 登录，仅用于快速闭环测试。
          <br />
          生产环境必须替换为真实认证方案（NextAuth/OAuth）。
        </div>
      </div>
    </div>
  );
}

// Next.js 15: useSearchParams must be wrapped in Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
