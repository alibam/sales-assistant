/**
 * SalesRepDashboard - 销售代表看板
 * 
 * Vercel/Linear 极简风格
 */
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
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          销售代表看板
        </h1>
        <p className="text-sm text-slate-500">
          客户管理与跟进概览
        </p>
      </div>

      {/* A/B/C/D 统计 - Bento Box 极简卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* A 级客户 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">A 级</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-3xl font-semibold text-slate-900">
            {stats.A}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            高意向客户
          </div>
        </div>

        {/* B 级客户 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">B 级</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-3xl font-semibold text-slate-900">
            {stats.B}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            中意向客户
          </div>
        </div>

        {/* C 级客户 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">C 级</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-3xl font-semibold text-slate-900">
            {stats.C}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            初步接触
          </div>
        </div>

        {/* D 级客户 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">D 级</span>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
          </div>
          <div className="text-3xl font-semibold text-slate-900">
            {stats.D}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            潜在客户
          </div>
        </div>
      </div>

      {/* 待跟进列表 */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            待跟进客户
          </h2>
        </div>
        
        {followUpList.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-slate-400 mb-2">
              {totalCustomers === 0 ? '暂无客户数据' : '暂无需要跟进的客户'}
            </div>
            <p className="text-sm text-slate-500">
              {totalCustomers === 0 ? '请先添加客户' : '所有客户已跟进'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {followUpList.map((customer) => (
              <li 
                key={customer.id} 
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-700">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {customer.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {customer.status} 级客户
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatRelativeTime(customer.updatedAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
