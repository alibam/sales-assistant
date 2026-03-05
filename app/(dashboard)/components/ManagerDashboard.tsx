/**
 * ManagerDashboard - 销售经理看板
 * 
 * Vercel/Linear 极简风格
 */
import { Session } from '@/lib/auth/session';
import { getSalesFunnel, getAlerts } from '../actions/stats';

interface Props {
  session: Session;
}

export default async function ManagerDashboard({ session }: Props) {
  // Fetch real data from database
  const funnel = await getSalesFunnel();
  const alerts = await getAlerts();

  const totalCustomers = funnel.D + funnel.C + funnel.B + funnel.A;
  const maxCount = Math.max(funnel.D, funnel.C, funnel.B, funnel.A, 1);

  // Calculate width percentages for funnel visualization
  const widths = {
    D: totalCustomers > 0 ? (funnel.D / maxCount) * 100 : 0,
    C: totalCustomers > 0 ? (funnel.C / maxCount) * 100 : 0,
    B: totalCustomers > 0 ? (funnel.B / maxCount) * 100 : 0,
    A: totalCustomers > 0 ? (funnel.A / maxCount) * 100 : 0,
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          销售经理看板
        </h1>
        <p className="text-sm text-slate-500">
          团队销售漏斗与异常监控
        </p>
      </div>

      {/* 全店漏斗 - 极简卡片 */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-8">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            全店销售漏斗
          </h2>
        </div>
        
        <div className="p-6">
          {totalCustomers === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">暂无客户数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* A 级漏斗条 */}
              <div className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium text-slate-700">A 级</div>
                <div className="flex-1 bg-slate-100 h-8 rounded-lg overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-8 rounded-lg transition-all duration-500"
                    style={{ width: `${widths.A}%` }}
                  >
                    {funnel.A > 0 && (
                      <span className="px-3 text-sm font-medium text-white flex items-center h-full">
                        {funnel.A}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* B 级漏斗条 */}
              <div className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium text-slate-700">B 级</div>
                <div className="flex-1 bg-slate-100 h-8 rounded-lg overflow-hidden">
                  <div 
                    className="bg-blue-500 h-8 rounded-lg transition-all duration-500"
                    style={{ width: `${widths.B}%` }}
                  >
                    {funnel.B > 0 && (
                      <span className="px-3 text-sm font-medium text-white flex items-center h-full">
                        {funnel.B}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* C 级漏斗条 */}
              <div className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium text-slate-700">C 级</div>
                <div className="flex-1 bg-slate-100 h-8 rounded-lg overflow-hidden">
                  <div 
                    className="bg-amber-500 h-8 rounded-lg transition-all duration-500"
                    style={{ width: `${widths.C}%` }}
                  >
                    {funnel.C > 0 && (
                      <span className="px-3 text-sm font-medium text-white flex items-center h-full">
                        {funnel.C}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* D 级漏斗条 */}
              <div className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium text-slate-700">D 级</div>
                <div className="flex-1 bg-slate-100 h-8 rounded-lg overflow-hidden">
                  <div 
                    className="bg-slate-400 h-8 rounded-lg transition-all duration-500"
                    style={{ width: `${widths.D}%` }}
                  >
                    {funnel.D > 0 && (
                      <span className="px-3 text-sm font-medium text-white flex items-center h-full">
                        {funnel.D}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 异常卡点警告 */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            异常卡点警告
          </h2>
        </div>
        
        <div className="p-5">
          {alerts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm">暂无异常警告</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {alerts.map((alert, i) => (
                <li 
                  key={i} 
                  className={`p-4 rounded-lg border ${
                    alert.type === 'danger' 
                      ? 'bg-red-50 border-red-200 text-red-700' 
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
                >
                  <p className="text-sm font-medium">{alert.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
