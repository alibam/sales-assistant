/**
 * Dashboard Page - 仪表盘
 * 
 * 登录后的主页
 */
import { requireAuth } from '@/lib/auth/session';
import Link from 'next/link';

export default async function DashboardPage() {
  // 验证登录状态
  const session = await requireAuth();
  
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
        🏠 Dashboard
      </h1>
      
      <div style={{ 
        padding: '24px', 
        background: '#ffffff', 
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
          欢迎回来！
        </h2>
        <p style={{ color: '#64748b', marginBottom: '8px' }}>
          用户 ID: {session.userId}
        </p>
        <p style={{ color: '#64748b', marginBottom: '8px' }}>
          租户 ID: {session.tenantId}
        </p>
        <p style={{ color: '#64748b' }}>
          角色: {session.role}
        </p>
      </div>
      
      <div style={{ 
        padding: '24px', 
        background: '#f8fafc', 
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          快速导航
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            href="/customer/00000000-0000-0000-0000-000000000003"
            style={{
              padding: '12px 16px',
              background: '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            查看客户详情（Demo）
          </Link>
        </div>
      </div>
    </div>
  );
}
