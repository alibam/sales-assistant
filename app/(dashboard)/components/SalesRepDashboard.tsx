import { Session } from '@/lib/auth/session';
import { getCustomerStats, getFollowUpCustomers } from '../actions/stats';

interface Props {
  session: Session;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '1天前';
  return `${diffDays}天前`;
}

export default async function SalesRepDashboard({ session }: Props) {
  // Fetch real data from database
  const stats = await getCustomerStats();
  const followUpList = await getFollowUpCustomers();

  const totalCustomers = stats.A + stats.B + stats.C + stats.D;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">销售代表看板</h1>

      {/* A/B/C/D 统计 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-green-100 p-4 rounded">
          <div className="text-3xl font-bold">{stats.A}</div>
          <div className="text-sm">A 级客户</div>
        </div>
        <div className="bg-blue-100 p-4 rounded">
          <div className="text-3xl font-bold">{stats.B}</div>
          <div className="text-sm">B 级客户</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded">
          <div className="text-3xl font-bold">{stats.C}</div>
          <div className="text-sm">C 级客户</div>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <div className="text-3xl font-bold">{stats.D}</div>
          <div className="text-sm">D 级客户</div>
        </div>
      </div>

      {/* 待跟进列表 */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-4">待跟进客户</h2>
        {followUpList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {totalCustomers === 0 ? (
              <p>暂无客户数据，请先添加客户</p>
            ) : (
              <p>暂无需要跟进的客户</p>
            )}
          </div>
        ) : (
          <ul>
            {followUpList.map((customer) => (
              <li key={customer.id} className="py-2 border-b">
                {customer.name} - {customer.status} 级 - {formatRelativeTime(customer.updatedAt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
