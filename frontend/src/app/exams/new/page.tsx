'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { examAPI, questionAPI } from '@/lib/api';
import { Question, QuestionType, DifficultyLevel } from '@/types';
import { questionTypeLabels, difficultyLabels } from '@/utils';

const CreateExamPage = () => {
  const router = useRouter();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Array<{ questionId: string; score: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    duration: 60,
    startTime: '',
    endTime: '',
    shuffleQuestions: true,
    shuffleOptions: true,
  });

  const [autoRules, setAutoRules] = useState<Array<{
    type: QuestionType | '';
    difficulty: DifficultyLevel | '';
    count: number;
    scorePerQuestion: number;
  }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subjectsRes] = await Promise.all([
          questionAPI.getSubjects(),
        ]);
        setSubjects(subjectsRes.data.data || []);
      } catch (error) {
        console.error('获取数据失败:', error);
      }
    };
    fetchData();
  }, []);

  const handleSubjectChange = async (subject: string) => {
    setFormData({ ...formData, subject });
    try {
      const response = await questionAPI.getQuestions({ subject, limit: 100 });
      setQuestions(response.data.data || []);
    } catch (error) {
      console.error('获取题目失败:', error);
    }
  };

  const toggleQuestion = (questionId: string) => {
    const exists = selectedQuestions.find(q => q.questionId === questionId);
    if (exists) {
      setSelectedQuestions(selectedQuestions.filter(q => q.questionId !== questionId));
    } else {
      const question = questions.find(q => q._id === questionId);
      setSelectedQuestions([...selectedQuestions, {
        questionId,
        score: question?.score || 2,
      }]);
    }
  };

  const addRule = () => {
    setAutoRules([...autoRules, { type: '', difficulty: '', count: 5, scorePerQuestion: 2 }]);
  };

  const updateRule = (index: number, field: string, value: any) => {
    const newRules = [...autoRules];
    (newRules[index] as any)[field] = value;
    setAutoRules(newRules);
  };

  const removeRule = (index: number) => {
    setAutoRules(autoRules.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'auto') {
        await examAPI.autoGenerateExam({
          ...formData,
          rules: autoRules,
        });
      } else {
        const totalScore = selectedQuestions.reduce((sum, q) => sum + q.score, 0);
        await examAPI.createExam({
          ...formData,
          totalScore,
          questions: selectedQuestions.map((q, index) => ({
            questionId: q.questionId,
            order: index + 1,
            score: q.score,
          })),
          status: 'draft',
        });
      }
      router.push('/exams');
    } catch (error: any) {
      alert(error.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const totalScore = selectedQuestions.reduce((sum, q) => sum + q.score, 0);

  return (
    <ProtectedRoute roles={['teacher']}>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/exams" className="text-gray-500 hover:text-gray-700">
              ← 返回
            </Link>
            <h1 className="text-2xl font-bold">创建考试</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">基本信息</h2>
              </div>
              <div className="card-body space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">考试标题 *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">学科 *</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="">请选择学科</option>
                      {subjects.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">考试描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">时长（分钟） *</label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                      className="input-field"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 *</label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">结束时间 *</label>
                    <input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.shuffleQuestions}
                      onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                      className="mr-2"
                    />
                    随机题目顺序
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.shuffleOptions}
                      onChange={(e) => setFormData({ ...formData, shuffleOptions: e.target.checked })}
                      className="mr-2"
                    />
                    随机选项顺序
                  </label>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="text-lg font-semibold">组卷方式</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className={`px-4 py-2 rounded-lg ${mode === 'manual' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
                  >
                    手动选题
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('auto')}
                    className={`px-4 py-2 rounded-lg ${mode === 'auto' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
                  >
                    智能组卷
                  </button>
                </div>
              </div>

              <div className="card-body">
                {mode === 'manual' ? (
                  <div>
                    {!formData.subject ? (
                      <p className="text-gray-500 text-center py-8">请先选择学科</p>
                    ) : questions.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">该学科暂无题目</p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {questions.map((q) => (
                          <div
                            key={q._id}
                            onClick={() => toggleQuestion(q._id)}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedQuestions.find(sq => sq.questionId === q._id)
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-primary-300'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                    {questionTypeLabels[q.type]}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                    {difficultyLabels[q.difficulty]}
                                  </span>
                                  <span className="text-xs text-gray-500">{q.score}分</span>
                                </div>
                                <p className="text-sm text-gray-700 line-clamp-2">{q.content}</p>
                              </div>
                              <div className="ml-4">
                                <input
                                  type="checkbox"
                                  checked={!!selectedQuestions.find(sq => sq.questionId === q._id)}
                                  readOnly
                                  className="w-5 h-5"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        已选择 {selectedQuestions.length} 题，总分 {totalScore} 分
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    {autoRules.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">请添加组卷规则</p>
                    ) : (
                      <div className="space-y-4">
                        {autoRules.map((rule, index) => (
                          <div key={index} className="flex items-end gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1">题型</label>
                              <select
                                value={rule.type}
                                onChange={(e) => updateRule(index, 'type', e.target.value)}
                                className="input-field"
                              >
                                <option value="">全部题型</option>
                                {Object.entries(questionTypeLabels).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1">难度</label>
                              <select
                                value={rule.difficulty}
                                onChange={(e) => updateRule(index, 'difficulty', e.target.value)}
                                className="input-field"
                              >
                                <option value="">全部难度</option>
                                {Object.entries(difficultyLabels).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="w-24">
                              <label className="block text-xs text-gray-500 mb-1">数量</label>
                              <input
                                type="number"
                                value={rule.count}
                                onChange={(e) => updateRule(index, 'count', parseInt(e.target.value))}
                                className="input-field"
                                min="1"
                              />
                            </div>
                            <div className="w-24">
                              <label className="block text-xs text-gray-500 mb-1">每题分值</label>
                              <input
                                type="number"
                                value={rule.scorePerQuestion}
                                onChange={(e) => updateRule(index, 'scorePerQuestion', parseInt(e.target.value))}
                                className="input-field"
                                min="1"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRule(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={addRule}
                      className="mt-4 text-primary-600 hover:text-primary-700 text-sm"
                    >
                      + 添加规则
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/exams" className="btn-secondary">
                取消
              </Link>
              <button
                type="submit"
                disabled={loading || (mode === 'manual' && selectedQuestions.length === 0)}
                className="btn-primary"
              >
                {loading ? '创建中...' : '创建考试'}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default CreateExamPage;
