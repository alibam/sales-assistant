/**
 * AdminDashboard - 管理员看板
 * 
 * Vercel/Linear 极简风格
 */
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
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          管理员看板
        </h1>
        <p className="text-sm text-slate-500">
          知识库管理与系统配置
        </p>
      </div>

      {/* 知识库上传表单 - 极简卡片 */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            知识库上传
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            上传企业文档到 RAG 向量知识库
          </p>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              文档标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors"
              placeholder="例如：产品手册 v1.0"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              文档内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 h-64 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors font-mono text-sm"
              placeholder="粘贴文档内容..."
              disabled={loading}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '向量化中...' : '向量化并保存'}
          </button>

          {message && (
            <div
              className={`p-4 rounded-lg text-sm font-medium ${
                message.includes('成功')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
