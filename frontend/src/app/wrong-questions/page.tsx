'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { wrongQuestionAPI } from '@/lib/api';
import { WrongQuestion, Question } from '@/types';
import { questionTypeLabels, difficultyLabels, difficultyColors } from '@/utils';

const WrongQuestionsPage = () => {
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    bySubject: {} as Record<string, number>,
    byKnowledgePoint: {} as Record<string, number>,
    byDifficulty: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);
  const [knowledgePointFilter, setKnowledgePointFilter] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (knowledgePointFilter) params.knowledgePoint = knowledgePointFilter;

      const [questionsRes, statsRes] = await Promise.all([
        wrongQuestionAPI.getWrongQuestions(params),
        wrongQuestionAPI.getStats(),
      ]);

      setWrongQuestions(questionsRes.data.data || []);
      setStats(statsRes.data.data || { total: 0, bySubject: {}, byKnowledgePoint: {}, byDifficulty: {} });
    } catch (error) {
      console.error('获取错题本失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [knowledgePointFilter]);

  const handleRemove = async (id: string) => {
    if (!confirm('确定要从错题本移除吗？')) return;

    try {
      await wrongQuestionAPI.removeWrongQuestion(id);
      fetchData();
    } catch (error) {
      console.error('移除失败:', error);
    }
  };

  const knowledgePoints = Object.keys(stats.byKnowledgePoint);

  return (
    <ProtectedRoute roles={['student']}>
      <Layout>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">错题本</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-sm text-gray-500">错题总数</p>
              <p className="text-3xl font-bold text-primary-600">{stats.total}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">学科数</p>
              <p className="text-3xl font-bold text-green-600">{Object.keys(stats.bySubject).length}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">知识点数</p>
              <p className="text-3xl font-bold text-orange-600">{Object.keys(stats.byKnowledgePoint).length}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">困难题</p>
              <p className="text-3xl font-bold text-red-600">{stats.byDifficulty['hard'] || 0}</p>
            </div>
          </div>

          {knowledgePoints.length > 0 && (
            <div className="card mb-6">
              <div className="card-body">
                <label className="block text-sm font-medium text-gray-700 mb-2">按知识点筛选</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setKnowledgePointFilter('')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      knowledgePointFilter === ''
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    全部
                  </button>
                  {knowledgePoints.map((p) => (
                    <button
                      key={p}
                      onClick={() => setKnowledgePointFilter(p)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        knowledgePointFilter === p
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p} ({stats.byKnowledgePoint[p]})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : wrongQuestions.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-12">
                <p className="text-4xl mb-4">🎉</p>
                <p className="text-gray-500">太棒了！错题本空空如也</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {wrongQuestions.map((wq) => {
                const question = (wq as any).question as Question;
                if (!question) return null;

                return (
                  <div key={wq._id} className="card">
                    <div className="card-body">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                            {questionTypeLabels[question.type]}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${difficultyColors[question.difficulty]}`}>
                            {difficultyLabels[question.difficulty]}
                          </span>
                          <span className="text-xs text-gray-500">{question.subject}</span>
                        </div>
                        <button
                          onClick={() => handleRemove(wq._id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          移除
                        </button>
                      </div>

                      <p className="text-gray-900 mb-4">{question.content}</p>

                      {question.options && (
                        <div className="space-y-2 mb-4">
                          {question.options.map((opt) => (
                            <div
                              key={opt.key}
                              className={`p-2 rounded text-sm ${
                                opt.isCorrect ? 'bg-green-50 text-green-800' : 'text-gray-600'
                              }`}
                            >
                              <span className="font-medium">{opt.key}.</span> {opt.content}
                              {opt.isCorrect && <span className="ml-2 text-green-600">✓ 正确答案</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type !== 'single' && question.type !== 'multiple' && (
                        <div className="p-2 bg-green-50 rounded text-sm mb-4">
                          <span className="font-medium text-green-800">正确答案：</span>
                          <span className="text-green-700">{question.answer}</span>
                        </div>
                      )}

                      <div className="p-2 bg-red-50 rounded text-sm">
                        <span className="font-medium text-red-800">我的答案：</span>
                        <span className="text-red-700">
                          {Array.isArray(wq.userAnswer) ? wq.userAnswer.join(', ') : wq.userAnswer}
                        </span>
                      </div>

                      {question.explanation && (
                        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
                          <span className="font-medium">解析：</span>{question.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default WrongQuestionsPage;
