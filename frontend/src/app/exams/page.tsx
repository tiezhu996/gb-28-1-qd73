'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { examAPI } from '@/lib/api';
import { Exam } from '@/types';
import { formatDate, examStatusLabels, examStatusColors } from '@/utils';

const ExamsPage = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchExams = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      
      const response = await examAPI.getExams(params);
      setExams(response.data.data || []);
    } catch (error) {
      console.error('获取考试列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [statusFilter]);

  const handlePublish = async (examId: string) => {
    try {
      await examAPI.publishExam(examId);
      fetchExams();
    } catch (error) {
      console.error('发布失败:', error);
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm('确定要删除这个考试吗？')) return;
    
    try {
      await examAPI.deleteExam(examId);
      fetchExams();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">考试管理</h1>
            {user?.role === 'teacher' && (
              <Link href="/exams/new" className="btn-primary">
                + 创建考试
              </Link>
            )}
          </div>

          <div className="card mb-6">
            <div className="card-body">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态筛选</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field w-40"
                  >
                    <option value="">全部状态</option>
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                    <option value="ongoing">进行中</option>
                    <option value="ended">已结束</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : exams.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-12">
                <p className="text-4xl mb-4">📋</p>
                <p className="text-gray-500">暂无考试</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {exams.map((exam) => (
                <div key={exam._id} className="card">
                  <div className="card-body">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{exam.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs ${examStatusColors[exam.status]}`}>
                            {examStatusLabels[exam.status]}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-500">
                          <p>学科：{exam.subject}</p>
                          <p>总分：{exam.totalScore}分 · 时长：{exam.duration}分钟</p>
                          <p>时间：{formatDate(exam.startTime)} - {formatDate(exam.endTime)}</p>
                          <p>题目数量：{exam.questions.length}题</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      {user?.role === 'teacher' ? (
                        <>
                          <Link
                            href={`/exams/${exam._id}`}
                            className="btn-secondary text-sm"
                          >
                            查看详情
                          </Link>
                          <Link
                            href={`/exams/${exam._id}/results`}
                            className="btn-secondary text-sm"
                          >
                            成绩分析
                          </Link>
                          {exam.status === 'draft' && (
                            <>
                              <Link
                                href={`/exams/${exam._id}/edit`}
                                className="btn-secondary text-sm"
                              >
                                编辑
                              </Link>
                              <button
                                onClick={() => handlePublish(exam._id)}
                                className="btn-primary text-sm"
                              >
                                发布
                              </button>
                            </>
                          )}
                          {exam.status === 'draft' && (
                            <button
                              onClick={() => handleDelete(exam._id)}
                              className="btn-danger text-sm"
                            >
                              删除
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {exam.status === 'published' && (
                            <button
                              onClick={() => router.push(`/exams/${exam._id}/take`)}
                              className="btn-primary text-sm"
                            >
                              开始考试
                            </button>
                          )}
                          {exam.status === 'ended' && (
                            <Link
                              href={`/exams/${exam._id}/result`}
                              className="btn-secondary text-sm"
                            >
                              查看成绩
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default ExamsPage;
