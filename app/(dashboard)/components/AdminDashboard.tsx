'use client';

import { useState } from 'react';
import { Session } from '@/lib/auth/session';
import { uploadDocument } from '../actions/knowledge';

interface Props {
  session: Session;
}

export default function AdminDashboard({ session }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    if (!title || !content) {
      setMessage('请填写标题和内容');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await uploadDocument(title, content);
      setMessage(result.message);

      if (result.success) {
        setTitle('');
        setContent('');
      }
    } catch (error) {
      setMessage('上传失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">管理员看板</h1>

      {/* 知识库上传表单 */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">知识库上传</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">文档标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="例如：产品手册 v1.0"
            disabled={loading}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">文档内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border rounded px-3 py-2 h-64 font-mono text-sm"
            placeholder="粘贴文档内容..."
            disabled={loading}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '向量化中...' : '向量化并保存'}
        </button>

        {message && (
          <div
            className={`mt-4 p-3 rounded ${
              message.includes('成功')
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
