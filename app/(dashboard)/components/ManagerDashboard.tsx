import { Session } from '@/lib/auth/session';

interface Props {
  session: Session;
}

export default function ManagerDashboard({ session }: Props) {
  // Mock 数据
  const funnel = {
    D: 150,
    C: 80,
    B: 40,
    A: 15,
  };

  const alerts = [
    { type: 'warning', message: 'B 级客户转化率下降 15%' },
    { type: 'danger', message: '3 个 A 级客户超过 7 天未跟进' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">销售经理看板</h1>

      {/* 全店漏斗 */}
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-bold mb-4">全店销售漏斗</h2>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-24">D 级</div>
            <div className="flex-1 bg-gray-200 h-8 rounded">
              <div className="bg-gray-400 h-8 rounded" style={{ width: '100%' }}>
                <span className="px-2 text-white">{funnel.D}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-24">C 级</div>
            <div className="flex-1 bg-gray-200 h-8 rounded">
              <div className="bg-yellow-400 h-8 rounded" style={{ width: '53%' }}>
                <span className="px-2">{funnel.C}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-24">B 级</div>
            <div className="flex-1 bg-gray-200 h-8 rounded">
              <div className="bg-blue-400 h-8 rounded" style={{ width: '27%' }}>
                <span className="px-2 text-white">{funnel.B}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-24">A 级</div>
            <div className="flex-1 bg-gray-200 h-8 rounded">
              <div className="bg-green-400 h-8 rounded" style={{ width: '10%' }}>
                <span className="px-2 text-white">{funnel.A}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 异常卡点警告 */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-4">异常卡点警告</h2>
        <ul className="space-y-2">
          {alerts.map((alert, i) => (
            <li key={i} className={`p-3 rounded ${
              alert.type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              {alert.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
