'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { examAPI, questionAPI } from '@/lib/api';
import { Exam, Question } from '@/types';
import { formatDate } from '@/utils';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalExams: 0,
    myExams: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const examsResponse = await examAPI.getExams({ limit: 5 });
        setRecentExams(examsResponse.data.data || []);
        
        if (user?.role === 'teacher') {
          const questionsResponse = await questionAPI.getQuestions({ limit: 1 });
          setStats({
            totalQuestions: questionsResponse.data.pagination?.total || 0,
            totalExams: examsResponse.data.pagination?.total || 0,
            myExams: examsResponse.data.pagination?.total || 0,
          });
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      }
    };

    fetchData();
  }, [user?.role]);

  const teacherStats = [
    { label: '题库总数', value: stats.totalQuestions, icon: '📚', color: 'bg-blue-500' },
    { label: '考试总数', value: stats.totalExams, icon: '📝', color: 'bg-green-500' },
    { label: '进行中', value: recentExams.filter(e => e.status === 'ongoing').length, icon: '⏰', color: 'bg-orange-500' },
  ];

  const studentStats = [
    { label: '可参加考试', value: recentExams.filter(e => e.status === 'published').length, icon: '📝', color: 'bg-blue-500' },
    { label: '已完成', value: 0, icon: '✅', color: 'bg-green-500' },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              欢迎回来，{user?.name}
            </h1>
            <p className="text-gray-500 mt-1">
              今天是 {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {(user?.role === 'teacher' ? teacherStats : studentStats).map((stat, index) => (
              <div key={index} className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center text-2xl`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="text-lg font-semibold">最近考试</h2>
                <Link href="/exams" className="text-primary-600 hover:text-primary-700 text-sm">
                  查看全部
                </Link>
              </div>
              <div className="card-body">
                {recentExams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-4xl mb-2">📋</p>
                    <p>暂无考试</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentExams.map((exam) => (
                      <Link
                        key={exam._id}
                        href={user?.role === 'teacher' ? `/exams/${exam._id}` : `/exams/${exam._id}`}
                        className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{exam.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {exam.subject} · {exam.totalScore}分 · {exam.duration}分钟
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              开始时间：{formatDate(exam.startTime)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            exam.status === 'published' ? 'bg-blue-100 text-blue-800' :
                            exam.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                            exam.status === 'ended' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {exam.status === 'draft' ? '草稿' : 
                             exam.status === 'published' ? '已发布' :
                             exam.status === 'ongoing' ? '进行中' : '已结束'}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">快速操作</h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-4">
                  {user?.role === 'teacher' ? (
                    <>
                      <Link
                        href="/questions/new"
                        className="p-4 border border-gray-200 rounded-lg text-center hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      >
                        <p className="text-3xl mb-2">➕</p>
                        <p className="font-medium">新建题目</p>
                      </Link>
                      <Link
                        href="/exams/new"
                        className="p-4 border border-gray-200 rounded-lg text-center hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      >
                        <p className="text-3xl mb-2">📝</p>
                        <p className="font-medium">创建考试</p>
                      </Link>
                      <Link
                        href="/questions"
                        className="p-4 border border-gray-200 rounded-lg text-center hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      >
                        <p className="text-3xl mb-2">📚</p>
                        <p className="font-medium">题库管理</p>
                      </Link>
                      <Link
                        href="/exams"
                        className="p-4 border border-gray-200 rounded-lg text-center hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      >
                        <p className="text-3xl mb-2">📊</p>
                        <p className="font-medium">成绩分析</p>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/exams"
                        className="p-4 border border-gray-200 rounded-lg text-center hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      >
                        <p className="text-3xl mb-2">📝</p>
                        <p className="font-medium">参加考试</p>
                      </Link>
                      <Link
                        href="/wrong-questions"
                        className="p-4 border border-gray-200 rounded-lg text-center hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      >
                        <p className="text-3xl mb-2">📖</p>
                        <p className="font-medium">错题本</p>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default Dashboard;
