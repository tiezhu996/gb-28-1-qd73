'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { examRecordAPI } from '@/lib/api';
import { ExamRecord, ExamStats } from '@/types';
import { formatDate } from '@/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const ResultsPage = ({ params }: { params: { id: string } }) => {
  const examId = params.id;
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await examRecordAPI.getExamResults(examId);
        const data = response.data.data;
        setRecords(data.records || []);
        setStats(data.stats || null);
      } catch (error) {
        console.error('获取成绩分析失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [examId]);

  const handleGradeQuestion = async (recordId: string, questionId: string, score: number) => {
    try {
      await examRecordAPI.gradeQuestion(recordId, questionId, score);
      const response = await examRecordAPI.getExamResults(examId);
      const data = response.data.data;
      setRecords(data.records || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('批改失败:', error);
    }
  };

  const distributionChartData = stats ? {
    labels: Object.keys(stats.scoreDistribution),
    datasets: [
      {
        label: '人数',
        data: Object.values(stats.scoreDistribution),
        backgroundColor: [
          '#ef4444',
          '#f59e0b',
          '#eab308',
          '#84cc16',
          '#22c55e',
        ],
      },
    ],
  } : null;

  return (
    <ProtectedRoute roles={['teacher']}>
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/exams" className="text-gray-500 hover:text-gray-700">
              ← 返回
            </Link>
            <h1 className="text-2xl font-bold">成绩分析</h1>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : !stats ? (
            <div className="card">
              <div className="card-body text-center py-12">
                <p className="text-gray-500">暂无成绩数据</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="card p-4 text-center">
                  <p className="text-sm text-gray-500">参考人数</p>
                  <p className="text-3xl font-bold text-primary-600">{stats.total}</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-sm text-gray-500">平均分</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.averageScore}</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-sm text-gray-500">最高分</p>
                  <p className="text-3xl font-bold text-green-600">{stats.highestScore}</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-sm text-gray-500">最低分</p>
                  <p className="text-3xl font-bold text-red-600">{stats.lowestScore}</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-sm text-gray-500">及格率</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.passRate}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-lg font-semibold">分数段分布</h2>
                  </div>
                  <div className="card-body">
                    {distributionChartData && (
                      <Bar
                        data={distributionChartData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { display: false },
                          },
                          scales: {
                            y: { beginAtZero: true, ticks: { stepSize: 1 } },
                          },
                        }}
                        height={250}
                      />
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h2 className="text-lg font-semibold">统计概览</h2>
                  </div>
                  <div className="card-body">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>优秀 (90-100)</span>
                          <span className="font-medium">{stats.scoreDistribution['90-100'] || 0} 人</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${((stats.scoreDistribution['90-100'] || 0) / (stats.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>良好 (80-89)</span>
                          <span className="font-medium">{stats.scoreDistribution['80-89'] || 0} 人</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-lime-500 h-2 rounded-full"
                            style={{ width: `${((stats.scoreDistribution['80-89'] || 0) / (stats.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>中等 (70-79)</span>
                          <span className="font-medium">{stats.scoreDistribution['70-79'] || 0} 人</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full"
                            style={{ width: `${((stats.scoreDistribution['70-79'] || 0) / (stats.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>及格 (60-69)</span>
                          <span className="font-medium">{stats.scoreDistribution['60-69'] || 0} 人</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${((stats.scoreDistribution['60-69'] || 0) / (stats.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>不及格 (0-59)</span>
                          <span className="font-medium">{stats.scoreDistribution['0-59'] || 0} 人</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${((stats.scoreDistribution['0-59'] || 0) / (stats.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold">成绩列表</h2>
                </div>
                <div className="card-body p-0">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">排名</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">学生</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">得分</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用时</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">切屏次数</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">提交时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {records.map((record, index) => {
                        const student = record.studentId as any;
                        return (
                          <tr key={record._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm ${
                                index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                index === 1 ? 'bg-gray-100 text-gray-800' :
                                index === 2 ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-50 text-gray-600'
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">{student?.name}</p>
                              <p className="text-sm text-gray-500">{student?.email}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-lg font-bold ${
                                record.obtainedScore >= 60 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {record.obtainedScore}
                              </span>
                              <span className="text-gray-400 text-sm"> / {record.totalScore}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {Math.floor(record.timeSpent / 60)} 分 {record.timeSpent % 60} 秒
                            </td>
                            <td className="px-6 py-4">
                              <span className={record.switchTabCount > 0 ? 'text-red-600' : 'text-gray-400'}>
                                {record.switchTabCount} 次
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {record.submittedAt ? formatDate(record.submittedAt) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default ResultsPage;
