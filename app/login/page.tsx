/**
 * Login Page - 登录页面
 * 
 * shadcn/ui 版本 - Vercel/Linear 极简风格
 */
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// shadcn/ui 组件
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
      
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-2xl">
            🔐
          </div>
          <div>
            <CardTitle className="text-2xl">Sales Assistant</CardTitle>
            <CardDescription>选择角色登录系统</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            {DEMO_USERS.map(user => (
              <Button
                key={user.username}
                onClick={() => handleLogin(user.username)}
                disabled={isLoading}
                className="w-full"
                variant="default"
              >
                {isLoading ? 'Logging in...' : user.label}
              </Button>
            ))}
          </div>
          
          <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-600">
            <span className="font-medium">⚠️ 开发环境</span>
            <p className="mt-1">这是 Mock 登录，仅用于快速闭环测试。生产环境必须替换为真实认证方案。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
