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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">销售经理看板</h1>

      {/* 全店漏斗 */}
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-bold mb-4">全店销售漏斗</h2>
        {totalCustomers === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无客户数据，请先添加客户</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-24">D 级</div>
              <div className="flex-1 bg-gray-200 h-8 rounded">
                <div className="bg-gray-400 h-8 rounded" style={{ width: `${widths.D}%` }}>
                  <span className="px-2 text-white">{funnel.D}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-24">C 级</div>
              <div className="flex-1 bg-gray-200 h-8 rounded">
                <div className="bg-yellow-400 h-8 rounded" style={{ width: `${widths.C}%` }}>
                  <span className="px-2">{funnel.C}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-24">B 级</div>
              <div className="flex-1 bg-gray-200 h-8 rounded">
                <div className="bg-blue-400 h-8 rounded" style={{ width: `${widths.B}%` }}>
                  <span className="px-2 text-white">{funnel.B}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-24">A 级</div>
              <div className="flex-1 bg-gray-200 h-8 rounded">
                <div className="bg-green-400 h-8 rounded" style={{ width: `${widths.A}%` }}>
                  <span className="px-2 text-white">{funnel.A}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 异常卡点警告 */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-4">异常卡点警告</h2>
        {alerts.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p>暂无异常警告</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, i) => (
              <li key={i} className={`p-3 rounded ${
                alert.type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                {alert.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
