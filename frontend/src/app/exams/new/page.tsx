'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { examAPI, questionAPI } from '@/lib/api';
import {
  Question,
  QuestionType,
  DifficultyLevel,
  AutoGroupRule,
  AutoGroupShortfall,
} from '@/types';
import { questionTypeLabels, difficultyLabels } from '@/utils';

const CreateExamPage = () => {
  const router = useRouter();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<string[]>([]);
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

  const [autoRules, setAutoRules] = useState<AutoGroupRule[]>([]);
  const [shortfalls, setShortfalls] = useState<AutoGroupShortfall[]>([]);
  const [checking, setChecking] = useState(false);
  const [feasibleInfo, setFeasibleInfo] = useState<{ totalQuestions: number; totalScore: number } | null>(null);
  const [clientErrors, setClientErrors] = useState<string[]>([]);

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
    setShortfalls([]);
    setFeasibleInfo(null);
    if (!subject) {
      setQuestions([]);
      setKnowledgePoints([]);
      return;
    }
    try {
      const [questionRes, kpRes] = await Promise.all([
        questionAPI.getQuestions({ subject, limit: 100 }),
        questionAPI.getKnowledgePoints({ subject }),
      ]);
      setQuestions(questionRes.data.data || []);
      setKnowledgePoints(kpRes.data.data || []);
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
    setAutoRules([...autoRules, {
      type: '',
      difficulty: '',
      count: 5,
      scorePerQuestion: 2,
      knowledgeRequirements: [],
    }]);
  };

  const updateRule = (index: number, field: keyof AutoGroupRule, value: any) => {
    const newRules = [...autoRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setAutoRules(newRules);
  };

  const removeRule = (index: number) => {
    setAutoRules(autoRules.filter((_, i) => i !== index));
  };

  const addKnowledgeRequirement = (ruleIndex: number) => {
    const newRules = [...autoRules];
    newRules[ruleIndex] = {
      ...newRules[ruleIndex],
      knowledgeRequirements: [
        ...newRules[ruleIndex].knowledgeRequirements,
        { knowledgePoint: '', minCount: 1 },
      ],
    };
    setAutoRules(newRules);
  };

  const updateKnowledgeRequirement = (
    ruleIndex: number,
    kpIndex: number,
    field: 'knowledgePoint' | 'minCount',
    value: string | number,
  ) => {
    const newRules = [...autoRules];
    const requirements = [...newRules[ruleIndex].knowledgeRequirements];
    requirements[kpIndex] = { ...requirements[kpIndex], [field]: value };
    newRules[ruleIndex] = { ...newRules[ruleIndex], knowledgeRequirements: requirements };
    setAutoRules(newRules);
  };

  const removeKnowledgeRequirement = (ruleIndex: number, kpIndex: number) => {
    const newRules = [...autoRules];
    const requirements = newRules[ruleIndex].knowledgeRequirements.filter((_, i) => i !== kpIndex);
    newRules[ruleIndex] = { ...newRules[ruleIndex], knowledgeRequirements: requirements };
    setAutoRules(newRules);
  };

  /** 前端先做一轮规则自身校验（条数、知识点重复、必考合计），再调用后端预检题库缺口 */
  const validateRules = useCallback(async (): Promise<boolean> => {
    if (!formData.subject || autoRules.length === 0) {
      setShortfalls([]);
      setFeasibleInfo(null);
      setClientErrors([]);
      return false;
    }

    const errors: string[] = [];
    autoRules.forEach((rule, index) => {
      const label = `第 ${index + 1} 条规则`;
      if (!Number.isInteger(rule.count) || rule.count < 1) {
        errors.push(`${label}的抽题数量必须是大于0的整数`);
      }
      if (!Number.isFinite(rule.scorePerQuestion) || rule.scorePerQuestion < 0) {
        errors.push(`${label}的每题分值不合法`);
      }
      const points = rule.knowledgeRequirements.map(k => k.knowledgePoint.trim()).filter(Boolean);
      const duplicates = points.filter((p, i) => points.indexOf(p) !== i);
      if (duplicates.length > 0) {
        errors.push(`${label}中必考知识点「${[...new Set(duplicates)].join('、')}」重复配置，请合并条数`);
      }
      rule.knowledgeRequirements.forEach((k) => {
        if (!k.knowledgePoint.trim()) {
          errors.push(`${label}存在未填写名称的必考知识点`);
        }
        if (!Number.isInteger(k.minCount) || k.minCount < 1) {
          errors.push(`${label}必考知识点「${k.knowledgePoint || '未命名'}」的至少条数必须是大于0的整数`);
        }
      });
      const totalKp = rule.knowledgeRequirements.reduce((sum, k) => sum + (k.minCount || 0), 0);
      if (points.length === new Set(points).size && totalKp > rule.count) {
        errors.push(`${label}必考知识点条数合计 ${totalKp} 道，超过该规则抽题数量 ${rule.count} 道`);
      }
    });
    setClientErrors(errors);
    if (errors.length > 0) {
      setShortfalls([]);
      setFeasibleInfo(null);
      return false;
    }

    setChecking(true);
    try {
      const res = await examAPI.validateAutoGenerate({
        subject: formData.subject,
        rules: autoRules.map(rule => ({
          ...rule,
          knowledgeRequirements: rule.knowledgeRequirements.map(k => ({
            knowledgePoint: k.knowledgePoint.trim(),
            minCount: k.minCount,
          })),
        })),
      });
      if (res.data.feasible) {
        setShortfalls([]);
        setFeasibleInfo({
          totalQuestions: res.data.totalQuestions,
          totalScore: res.data.totalScore,
        });
        return true;
      }
      setShortfalls(res.data.shortfalls || []);
      setFeasibleInfo(null);
      return false;
    } catch (error: any) {
      setShortfalls([]);
      setFeasibleInfo(null);
      setClientErrors([error.response?.data?.message || '题库校验失败，请稍后重试']);
      return false;
    } finally {
      setChecking(false);
    }
  }, [formData.subject, autoRules]);

  // 规则或学科变化后自动预检（防抖）
  useEffect(() => {
    if (mode !== 'auto' || !formData.subject || autoRules.length === 0) {
      setShortfalls([]);
      setFeasibleInfo(null);
      setClientErrors([]);
      return;
    }
    const timer = setTimeout(() => {
      validateRules();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, formData.subject, autoRules]);

  const gapRuleIndexes = new Set(shortfalls.map(s => s.ruleIndex));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'auto') {
      setLoading(true);
      try {
        const ok = await validateRules();
        if (!ok) {
          return;
        }
        await examAPI.autoGenerateExam({
          ...formData,
          rules: autoRules,
        });
        router.push('/exams');
      } catch (error: any) {
        const data = error.response?.data;
        if (data?.shortfalls) {
          setShortfalls(data.shortfalls);
          setFeasibleInfo(null);
        } else {
          alert(data?.message || '创建失败');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
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
                    {!formData.subject ? (
                      <p className="text-gray-500 text-center py-8">请先选择学科后再配置组卷规则</p>
                    ) : (
                      <>
                        {autoRules.length === 0 ? (
                          <p className="text-gray-500 text-center py-8">请添加组卷规则</p>
                        ) : (
                          <div className="space-y-4">
                            {autoRules.map((rule, index) => (
                              <div
                                key={index}
                                className={`p-4 rounded-lg border ${
                                  gapRuleIndexes.has(index) ? 'border-red-400 bg-red-50' : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-end gap-4">
                                  <div className="flex items-center text-sm font-medium text-gray-700 w-16">
                                    规则{index + 1}
                                  </div>
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
                                      onChange={(e) => updateRule(index, 'count', parseInt(e.target.value) || 0)}
                                      className="input-field"
                                      min="1"
                                    />
                                  </div>
                                  <div className="w-24">
                                    <label className="block text-xs text-gray-500 mb-1">每题分值</label>
                                    <input
                                      type="number"
                                      value={rule.scorePerQuestion}
                                      onChange={(e) => updateRule(index, 'scorePerQuestion', parseInt(e.target.value) || 0)}
                                      className="input-field"
                                      min="0"
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

                                <div className="mt-3 pl-20">
                                  <div className="text-xs text-gray-500 mb-2">
                                    必考知识点（同一份卷子每道题只抽一次，满足条数的题目自动计入本规则数量）
                                  </div>
                                  {rule.knowledgeRequirements.length > 0 && (
                                    <div className="space-y-2">
                                      {rule.knowledgeRequirements.map((kp, kpIndex) => (
                                        <div key={kpIndex} className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            list={`knowledge-points-${index}`}
                                            value={kp.knowledgePoint}
                                            onChange={(e) => updateKnowledgeRequirement(index, kpIndex, 'knowledgePoint', e.target.value)}
                                            className="input-field flex-1"
                                            placeholder="选择或输入必考知识点"
                                          />
                                          <div className="flex items-center gap-1 whitespace-nowrap text-xs text-gray-500">
                                            至少
                                            <input
                                              type="number"
                                              value={kp.minCount}
                                              onChange={(e) => updateKnowledgeRequirement(index, kpIndex, 'minCount', parseInt(e.target.value) || 0)}
                                              className="input-field w-16"
                                              min="1"
                                            />
                                            道
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => removeKnowledgeRequirement(index, kpIndex)}
                                            className="text-red-600 hover:text-red-700 text-sm"
                                          >
                                            移除
                                          </button>
                                        </div>
                                      ))}
                                      <datalist id={`knowledge-points-${index}`}>
                                        {knowledgePoints.map((p) => (
                                          <option key={p} value={p} />
                                        ))}
                                      </datalist>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => addKnowledgeRequirement(index)}
                                    className="mt-2 text-primary-600 hover:text-primary-700 text-xs"
                                  >
                                    + 添加必考知识点
                                  </button>
                                </div>
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

                        {autoRules.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {clientErrors.length > 0 && (
                              <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                                <p className="text-sm font-medium text-yellow-800 mb-1">规则配置有误：</p>
                                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                                  {clientErrors.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {shortfalls.length > 0 && (
                              <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                                <p className="text-sm font-medium text-red-800 mb-2">
                                  题库无法满足以下条件，组卷已被阻止（缺口已标红）：
                                </p>
                                <ul className="space-y-1">
                                  {shortfalls.map((s, i) => (
                                    <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                                      <span className={`mt-0.5 inline-block text-xs px-1.5 py-0.5 rounded ${
                                        s.kind === 'knowledge' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-700'
                                      }`}>
                                        {s.kind === 'knowledge' ? '知识点' : '题量'}
                                      </span>
                                      <span>{s.message}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {feasibleInfo && !checking && (
                              <div className="p-4 bg-green-50 border border-green-300 rounded-lg text-sm text-green-800">
                                题库满足全部规则：预计抽 {feasibleInfo.totalQuestions} 道题，总分 {feasibleInfo.totalScore} 分，同题不会重复出现。
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <button
                                type="button"
                                onClick={validateRules}
                                disabled={checking}
                                className="text-primary-600 hover:text-primary-700"
                              >
                                {checking ? '正在校验题库…' : '重新检查缺口'}
                              </button>
                              <span>修改规则后会自动重新校验</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
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
                disabled={
                  loading ||
                  checking ||
                  (mode === 'manual' && selectedQuestions.length === 0) ||
                  (mode === 'auto' && (autoRules.length === 0 || clientErrors.length > 0 || shortfalls.length > 0))
                }
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
