/**
 * Dashboard Page - 仪表盘
 *
 * 登录后的主页，根据角色分流到不同的看板
 */
import { requireAuth } from '@/lib/auth/session';
import SalesRepDashboard from '@/app/(dashboard)/components/SalesRepDashboard';
import ManagerDashboard from '@/app/(dashboard)/components/ManagerDashboard';
import AdminDashboard from '@/app/(dashboard)/components/AdminDashboard';

export default async function DashboardPage() {
  // 验证登录状态
  const session = await requireAuth();

  // 根据角色分流到不同的看板
  switch (session.role) {
    case 'SALES_REP':
      return <SalesRepDashboard session={session} />;
    case 'SALES_MANAGER':
      return <ManagerDashboard session={session} />;
    case 'TENANT_ADMIN':
      return <AdminDashboard session={session} />;
    default:
      return <div>未知角色</div>;
  }
}
