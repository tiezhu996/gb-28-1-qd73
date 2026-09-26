'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { questionAPI } from '@/lib/api';
import { QuestionType, DifficultyLevel } from '@/types';
import { questionTypeLabels, difficultyLabels } from '@/utils';

const NewQuestionPage = () => {
  const router = useRouter();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    type: 'single' as QuestionType,
    subject: '',
    knowledgePoints: [] as string[],
    difficulty: 'medium' as DifficultyLevel,
    score: 2,
    content: '',
    options: [
      { key: 'A', content: '', isCorrect: false },
      { key: 'B', content: '', isCorrect: false },
      { key: 'C', content: '', isCorrect: false },
      { key: 'D', content: '', isCorrect: false },
    ],
    answer: '',
    explanation: '',
  });

  const [newKnowledgePoint, setNewKnowledgePoint] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await questionAPI.getSubjects();
        setSubjects(response.data.data || []);
      } catch (error) {
        console.error('获取学科失败:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.subject) {
      questionAPI.getKnowledgePoints({ subject: formData.subject })
        .then((res) => setKnowledgePoints(res.data.data || []));
    }
  }, [formData.subject]);

  const handleOptionChange = (index: number, field: 'content' | 'isCorrect', value: any) => {
    const newOptions = [...formData.options];
    
    if (field === 'isCorrect') {
      if (formData.type === 'single') {
        newOptions.forEach((opt, i) => {
          newOptions[i] = { ...opt, isCorrect: i === index };
        });
      } else {
        newOptions[index] = { ...newOptions[index], isCorrect: value };
      }
    } else {
      newOptions[index] = { ...newOptions[index], [field]: value };
    }
    
    setFormData({ ...formData, options: newOptions });
  };

  const handleKnowledgePointToggle = (point: string) => {
    if (formData.knowledgePoints.includes(point)) {
      setFormData({
        ...formData,
        knowledgePoints: formData.knowledgePoints.filter(p => p !== point),
      });
    } else {
      setFormData({
        ...formData,
        knowledgePoints: [...formData.knowledgePoints, point],
      });
    }
  };

  const addKnowledgePoint = () => {
    if (newKnowledgePoint.trim() && !formData.knowledgePoints.includes(newKnowledgePoint.trim())) {
      setFormData({
        ...formData,
        knowledgePoints: [...formData.knowledgePoints, newKnowledgePoint.trim()],
      });
      setNewKnowledgePoint('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData: any = {
        type: formData.type,
        subject: formData.subject,
        knowledgePoints: formData.knowledgePoints,
        difficulty: formData.difficulty,
        score: formData.score,
        content: formData.content,
        explanation: formData.explanation,
      };

      if (formData.type === 'single' || formData.type === 'multiple') {
        submitData.options = formData.options;
        if (formData.type === 'single') {
          const correctOption = formData.options.find(o => o.isCorrect);
          submitData.answer = correctOption?.key || '';
        } else {
          submitData.answer = formData.options.filter(o => o.isCorrect).map(o => o.key);
        }
      } else {
        submitData.answer = formData.answer;
      }

      await questionAPI.createQuestion(submitData);
      router.push('/questions');
    } catch (error: any) {
      alert(error.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const needsOptions = ['single', 'multiple'].includes(formData.type);

  return (
    <ProtectedRoute roles={['teacher']}>
      <Layout>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/questions" className="text-gray-500 hover:text-gray-700">
              ← 返回
            </Link>
            <h1 className="text-2xl font-bold">新建题目</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">基本信息</h2>
              </div>
              <div className="card-body space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">题型 *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as QuestionType })}
                      className="input-field"
                    >
                      {Object.entries(questionTypeLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">学科 *</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value, knowledgePoints: [] })}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">难度</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as DifficultyLevel })}
                      className="input-field"
                    >
                      {Object.entries(difficultyLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">分值 *</label>
                    <input
                      type="number"
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) })}
                      className="input-field"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">知识点</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {knowledgePoints.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleKnowledgePointToggle(p)}
                        className={`text-xs px-3 py-1 rounded-full ${
                          formData.knowledgePoints.includes(p)
                            ? 'bg-primary-100 text-primary-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKnowledgePoint}
                      onChange={(e) => setNewKnowledgePoint(e.target.value)}
                      className="input-field flex-1"
                      placeholder="添加新知识点"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKnowledgePoint())}
                    />
                    <button type="button" onClick={addKnowledgePoint} className="btn-secondary">
                      添加
                    </button>
                  </div>
                  {formData.knowledgePoints.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500">已选择：</span>
                      {formData.knowledgePoints.map((p) => (
                        <span key={p} className="text-xs px-2 py-0.5 bg-primary-100 text-primary-800 rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">题目内容</h2>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">题目 *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="input-field min-h-24"
                    placeholder="请输入题目内容"
                    required
                  />
                </div>

                {needsOptions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      选项 {formData.type === 'single' ? '(单选)' : '(多选)'}
                    </label>
                    <div className="space-y-2">
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type={formData.type === 'single' ? 'radio' : 'checkbox'}
                            name="correctAnswer"
                            checked={option.isCorrect}
                            onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="font-medium w-6">{option.key}.</span>
                          <input
                            type="text"
                            value={option.content}
                            onChange={(e) => handleOptionChange(index, 'content', e.target.value)}
                            className="input-field flex-1"
                            placeholder={`选项 ${option.key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!needsOptions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">答案 *</label>
                    {formData.type === 'truefalse' ? (
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="answer"
                            value="true"
                            checked={formData.answer === 'true'}
                            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                            className="mr-2"
                          />
                          正确
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="answer"
                            value="false"
                            checked={formData.answer === 'false'}
                            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                            className="mr-2"
                          />
                          错误
                        </label>
                      </div>
                    ) : formData.type === 'fill' ? (
                      <input
                        type="text"
                        value={formData.answer}
                        onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                        className="input-field"
                        placeholder="请输入正确答案"
                        required
                      />
                    ) : (
                      <textarea
                        value={formData.answer}
                        onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                        className="input-field min-h-20"
                        placeholder="请输入参考答案"
                        required
                      />
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">解析</label>
                  <textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    className="input-field min-h-20"
                    placeholder="请输入题目解析（选填）"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/questions" className="btn-secondary">
                取消
              </Link>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? '保存中...' : '保存题目'}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default NewQuestionPage;
