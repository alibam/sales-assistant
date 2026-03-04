import { Session } from '@/lib/auth/session';

interface Props {
  session: Session;
}

export default function SalesRepDashboard({ session }: Props) {
  // Mock 数据
  const stats = {
    A: 5,
    B: 12,
    C: 8,
    D: 20,
  };

  const followUpList = [
    { name: '张伟', status: 'B', lastContact: '2天前' },
    { name: '李娜', status: 'C', lastContact: '5天前' },
  ];

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
        <ul>
          {followUpList.map((customer, i) => (
            <li key={i} className="py-2 border-b">
              {customer.name} - {customer.status} 级 - {customer.lastContact}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
