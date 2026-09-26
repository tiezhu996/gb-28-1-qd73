'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { examAPI } from '@/lib/api';
import { Exam, Question } from '@/types';
import { formatDate, questionTypeLabels, difficultyLabels, difficultyColors, examStatusLabels, examStatusColors } from '@/utils';

const ExamDetailPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const response = await examAPI.getExam(params.id);
        setExam(response.data.data);
      } catch (error) {
        console.error('获取考试详情失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [params.id]);

  const handlePublish = async () => {
    try {
      await examAPI.publishExam(params.id);
      router.push('/exams');
    } catch (error) {
      console.error('发布失败:', error);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!exam) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12 text-gray-500">考试不存在</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/exams" className="text-gray-500 hover:text-gray-700">
              ← 返回
            </Link>
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm ${examStatusColors[exam.status]}`}>
              {examStatusLabels[exam.status]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">基本信息</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">学科</span>
                  <span>{exam.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">总分</span>
                  <span className="font-semibold">{exam.totalScore} 分</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">时长</span>
                  <span>{exam.duration} 分钟</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">开始时间</span>
                  <span>{formatDate(exam.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">结束时间</span>
                  <span>{formatDate(exam.endTime)}</span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">考试设置</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">题目数量</span>
                  <span>{exam.questions.length} 题</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">随机题目</span>
                  <span>{exam.shuffleQuestions ? '✓ 是' : '✗ 否'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">随机选项</span>
                  <span>{exam.shuffleOptions ? '✓ 是' : '✗ 否'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">防作弊</span>
                  <span className="text-green-600">✓ 切屏检测</span>
                </div>
              </div>
            </div>
          </div>

          {exam.description && (
            <div className="card mb-6">
              <div className="card-header">
                <h2 className="text-lg font-semibold">考试说明</h2>
              </div>
              <div className="card-body">
                <p className="text-gray-700">{exam.description}</p>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">题目列表</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {exam.questions.map((eq, index) => {
                  const question = eq.questionId as Question;
                  if (!question) return null;

                  return (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">第 {index + 1} 题</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                            {questionTypeLabels[question.type]}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[question.difficulty]}`}>
                            {difficultyLabels[question.difficulty]}
                          </span>
                          <span className="text-xs text-primary-600 font-medium">{eq.score} 分</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{question.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            {user?.role === 'teacher' && exam.status === 'draft' && (
              <>
                <Link href={`/exams/${exam._id}/edit`} className="btn-secondary">
                  编辑
                </Link>
                <button onClick={handlePublish} className="btn-primary">
                  发布考试
                </button>
              </>
            )}
            {user?.role === 'teacher' && exam.status !== 'draft' && (
              <Link href={`/exams/${exam._id}/results`} className="btn-primary">
                成绩分析
              </Link>
            )}
            {user?.role === 'student' && exam.status === 'published' && (
              <Link href={`/exams/${exam._id}/take`} className="btn-primary">
                开始考试
              </Link>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default ExamDetailPage;
