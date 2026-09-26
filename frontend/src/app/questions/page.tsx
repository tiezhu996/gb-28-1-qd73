'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { questionAPI } from '@/lib/api';
import { Question } from '@/types';
import { questionTypeLabels, difficultyLabels, difficultyColors, formatDate } from '@/utils';

const QuestionsPage = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    subject: '',
    type: '',
    difficulty: '',
    knowledgePoint: '',
  });
  const [importing, setImporting] = useState(false);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.subject) params.subject = filters.subject;
      if (filters.type) params.type = filters.type;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.knowledgePoint) params.knowledgePoint = filters.knowledgePoint;
      
      const response = await questionAPI.getQuestions(params);
      setQuestions(response.data.data || []);
    } catch (error) {
      console.error('获取题目列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const subjectsRes = await questionAPI.getSubjects();
        setSubjects(subjectsRes.data.data || []);
      } catch (error) {
        console.error('获取学科失败:', error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (filters.subject) {
      questionAPI.getKnowledgePoints({ subject: filters.subject })
        .then((res) => setKnowledgePoints(res.data.data || []));
    } else {
      setKnowledgePoints([]);
    }
  }, [filters.subject]);

  useEffect(() => {
    fetchQuestions();
  }, [filters]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这道题目吗？')) return;
    
    try {
      await questionAPI.deleteQuestion(id);
      fetchQuestions();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const response = await questionAPI.importQuestions(file);
      alert(response.data.message);
      fetchQuestions();
    } catch (error: any) {
      alert(error.response?.data?.message || '导入失败');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <ProtectedRoute roles={['teacher']}>
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">题库管理</h1>
            <div className="flex gap-3">
              <label className={`btn-secondary cursor-pointer flex items-center ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                📥 批量导入
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>
              <Link href="/questions/new" className="btn-primary">
                + 新建题目
              </Link>
            </div>
          </div>

          <div className="card mb-6">
            <div className="card-body">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学科</label>
                  <select
                    value={filters.subject}
                    onChange={(e) => setFilters({ ...filters, subject: e.target.value, knowledgePoint: '' })}
                    className="input-field w-40"
                  >
                    <option value="">全部学科</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">题型</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="input-field w-32"
                  >
                    <option value="">全部题型</option>
                    {Object.entries(questionTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">难度</label>
                  <select
                    value={filters.difficulty}
                    onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                    className="input-field w-28"
                  >
                    <option value="">全部难度</option>
                    {Object.entries(difficultyLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                {knowledgePoints.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">知识点</label>
                    <select
                      value={filters.knowledgePoint}
                      onChange={(e) => setFilters({ ...filters, knowledgePoint: e.target.value })}
                      className="input-field w-40"
                    >
                      <option value="">全部知识点</option>
                      {knowledgePoints.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : questions.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-12">
                <p className="text-4xl mb-4">📚</p>
                <p className="text-gray-500">暂无题目</p>
                <p className="text-gray-400 text-sm mt-1">点击右上角按钮创建题目</p>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body p-0">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">题目</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">题型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">学科</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">难度</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分值</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {questions.map((q) => (
                      <tr key={q._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 max-w-md truncate">{q.content}</p>
                          {q.knowledgePoints.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {q.knowledgePoints.slice(0, 3).map((p) => (
                                <span key={p} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">{questionTypeLabels[q.type]}</td>
                        <td className="px-6 py-4 text-sm">{q.subject}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${difficultyColors[q.difficulty]}`}>
                            {difficultyLabels[q.difficulty]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">{q.score}分</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(q.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Link href={`/questions/${q._id}/edit`} className="text-primary-600 hover:text-primary-800 text-sm">
                              编辑
                            </Link>
                            <button onClick={() => handleDelete(q._id)} className="text-red-600 hover:text-red-800 text-sm">
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default QuestionsPage;
