'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { examRecordAPI, examAPI } from '@/lib/api';
import { Question } from '@/types';
import { formatTime, questionTypeLabels } from '@/utils';

const TakeExamPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const examId = params.id;

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  useEffect(() => {
    document.body.addEventListener('copy', preventCopy);
    document.body.addEventListener('paste', preventCopy);
    document.body.addEventListener('cut', preventCopy);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.body.removeEventListener('copy', preventCopy);
      document.body.removeEventListener('paste', preventCopy);
      document.body.removeEventListener('cut', preventCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const preventCopy = (e: Event) => {
    e.preventDefault();
    alert('考试期间禁止复制粘贴');
  };

  const handleVisibilityChange = async () => {
    if (document.hidden) {
      try {
        await examRecordAPI.recordSwitchTab(examId);
      } catch (error) {
        console.error('记录切屏失败:', error);
      }
    }
  };

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!showConfirmSubmit) {
      e.preventDefault();
      e.returnValue = '确定要离开吗？未提交的答案可能会丢失。';
    }
  };

  useEffect(() => {
    const startExam = async () => {
      try {
        const response = await examRecordAPI.startExam(examId);
        const data = response.data.data;
        
        setExam(data.exam);
        setQuestions(data.questions);
        setTimeLeft(data.exam.duration * 60);
        
        const initialAnswers: Record<string, any> = {};
        data.questions.forEach((q: Question & { userAnswer?: string | string[] }) => {
          if (q.userAnswer) {
            initialAnswers[q._id] = q.userAnswer;
          }
        });
        setAnswers(initialAnswers);
      } catch (error: any) {
        alert(error.response?.data?.message || '无法开始考试');
        router.push('/exams');
      } finally {
        setLoading(false);
      }
    };

    startExam();
  }, [examId, router]);

  useEffect(() => {
    if (loading) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        
        if (prev === 300) {
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 5000);
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading]);

  const handleAnswerChange = useCallback(async (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    
    try {
      await examRecordAPI.saveAnswer(examId, questionId, answer);
    } catch (error) {
      console.error('保存答案失败:', error);
    }
  }, [examId]);

  const toggleMark = (questionId: string) => {
    setMarkedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const response = await examRecordAPI.submitExam(examId);
      const result = response.data.data;
      setShowConfirmSubmit(true);
      alert(`考试提交成功！\n得分：${result.obtainedScore} / ${result.totalScore}`);
      router.push('/exams');
    } catch (error: any) {
      alert(error.response?.data?.message || '提交失败');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">加载考试中...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).filter(k => {
    const a = answers[k];
    if (Array.isArray(a)) return a.length > 0;
    return a !== '' && a !== undefined;
  }).length;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-3 z-50 animate-pulse">
          ⚠️ 距离考试结束还有 5 分钟，请尽快完成答题！
        </div>
      )}

      <div className="w-72 bg-white shadow-lg p-4 overflow-y-auto" style={{ height: '100vh' }}>
        <div className="mb-4">
          <h2 className="text-lg font-bold">{exam?.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{questions.length} 道题目</p>
        </div>

        <div className="mb-4 p-3 bg-red-50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600">剩余时间</p>
            <p className={`text-3xl font-bold ${timeLeft <= 300 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            已完成: {answeredCount} / {questions.length}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, index) => {
            const isAnswered = answers[q._id] && (
              Array.isArray(answers[q._id]) ? answers[q._id].length > 0 : answers[q._id] !== ''
            );
            const isMarked = markedQuestions.has(q._id);
            const isCurrent = index === currentIndex;

            return (
              <button
                key={q._id}
                onClick={() => setCurrentIndex(index)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors relative ${
                  isCurrent
                    ? 'bg-primary-600 text-white'
                    : isAnswered
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
                {isMarked && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full text-white text-xs flex items-center justify-center">
                    ★
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="w-full btn-primary"
            disabled={submitting}
          >
            {submitting ? '提交中...' : '提交试卷'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {currentQuestion && (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm px-3 py-1 bg-gray-100 rounded-full">
                    {questionTypeLabels[currentQuestion.type]}
                  </span>
                  <span className="text-sm text-gray-500">
                    第 {currentIndex + 1} 题 / 共 {questions.length} 题
                  </span>
                  <span className="text-sm text-primary-600 font-medium">
                    {currentQuestion.score} 分
                  </span>
                </div>
                <button
                  onClick={() => toggleMark(currentQuestion._id)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    markedQuestions.has(currentQuestion._id)
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {markedQuestions.has(currentQuestion._id) ? '★ 已标记' : '☆ 标记'}
                </button>
              </div>

              <div className="text-lg mb-8">
                <p>{currentQuestion.content}</p>
              </div>

              {currentQuestion.type === 'single' && (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => (
                    <label
                      key={option.key}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        answers[currentQuestion._id] === option.key
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={currentQuestion._id}
                        value={option.key}
                        checked={answers[currentQuestion._id] === option.key}
                        onChange={() => handleAnswerChange(currentQuestion._id, option.key)}
                        className="w-4 h-4 mr-3"
                      />
                      <span className="font-medium mr-2">{option.key}.</span>
                      <span>{option.content}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'multiple' && (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => {
                    const selected = (answers[currentQuestion._id] || []) as string[];
                    const isChecked = selected.includes(option.key);

                    return (
                      <label
                        key={option.key}
                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={option.key}
                          checked={isChecked}
                          onChange={() => {
                            const newSelected = isChecked
                              ? selected.filter(k => k !== option.key)
                              : [...selected, option.key];
                            handleAnswerChange(currentQuestion._id, newSelected);
                          }}
                          className="w-4 h-4 mr-3"
                        />
                        <span className="font-medium mr-2">{option.key}.</span>
                        <span>{option.content}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === 'truefalse' && (
                <div className="space-y-3">
                  {['true', 'false'].map((val) => (
                    <label
                      key={val}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        answers[currentQuestion._id] === val
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={currentQuestion._id}
                        value={val}
                        checked={answers[currentQuestion._id] === val}
                        onChange={() => handleAnswerChange(currentQuestion._id, val)}
                        className="w-4 h-4 mr-3"
                      />
                      <span className="font-medium">{val === 'true' ? '正确' : '错误'}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'fill' && (
                <div>
                  <input
                    type="text"
                    value={answers[currentQuestion._id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                    className="input-field text-lg"
                    placeholder="请输入答案"
                  />
                </div>
              )}

              {currentQuestion.type === 'essay' && (
                <div>
                  <textarea
                    value={answers[currentQuestion._id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                    className="input-field min-h-40"
                    placeholder="请输入答案"
                  />
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="btn-secondary disabled:opacity-50"
                >
                  上一题
                </button>
                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                    className="btn-primary"
                  >
                    下一题
                  </button>
                ) : (
                  <button
                    onClick={() => setShowConfirmSubmit(true)}
                    className="btn-primary"
                  >
                    完成
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">确认提交</h3>
            <p className="text-gray-600 mb-2">
              已完成 {answeredCount} / {questions.length} 题
            </p>
            {answeredCount < questions.length && (
              <p className="text-yellow-600 text-sm mb-4">
                ⚠️ 还有 {questions.length - answeredCount} 道题未作答
              </p>
            )}
            <p className="text-gray-600 mb-6">
              提交后将无法修改答案，确定要提交吗？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="btn-secondary"
              >
                继续答题
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? '提交中...' : '确认提交'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeExamPage;
