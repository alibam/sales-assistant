import { Session } from '@/lib/auth/session';

interface Props {
  session: Session;
}

export default function AdminDashboard({ session }: Props) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">管理员看板</h1>

      {/* 知识库上传入口（预留） */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">知识库管理</h2>
        <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center">
          <p className="text-gray-500 mb-4">知识库上传功能即将上线</p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded" disabled>
            上传文档（开发中）
          </button>
        </div>
      </div>
    </div>
  );
}
