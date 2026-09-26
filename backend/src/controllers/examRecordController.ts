import { Request, Response } from 'express';
import { ExamRecord } from '../models/ExamRecord';
import { Exam } from '../models/Exam';
import { Question } from '../models/Question';
import { WrongQuestion } from '../models/WrongQuestion';
import { AuthRequest, IAnswer } from '../types';
import { shuffleArray, compareAnswers, calculateScoreDistribution } from '../utils/helpers';
import { getRedisClient } from '../config/redis';

export const startExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const { examId } = req.params;
    const studentId = req.user.id;
    
    const exam = await Exam.findById(examId).populate('questions.questionId');
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' });
    }
    
    const now = new Date();
    if (now < exam.startTime) {
      return res.status(400).json({ message: '考试尚未开始' });
    }
    if (now > exam.endTime) {
      return res.status(400).json({ message: '考试已结束' });
    }
    
    let record = await ExamRecord.findOne({ examId, studentId });
    
    if (!record) {
      const answers: IAnswer[] = exam.questions.map((eq) => ({
        questionId: eq.questionId,
        answer: '',
        score: 0,
        isCorrect: false,
      }));
      
      record = await ExamRecord.create({
        examId,
        studentId,
        answers,
        totalScore: exam.totalScore,
        obtainedScore: 0,
        timeSpent: 0,
        switchTabCount: 0,
        status: 'in_progress',
      });
      
      const redis = getRedisClient();
      const examKey = `exam:${examId}:student:${studentId}`;
      await redis.set(examKey, Date.now().toString(), 'EX', exam.duration * 60);
    } else if (record.status === 'submitted') {
      return res.status(400).json({ message: '您已提交考试' });
    }
    
    let questions = exam.questions.map((eq: any) => ({
      ...eq.questionId.toObject(),
      examScore: eq.score,
      userAnswer: record!.answers.find(a => a.questionId.toString() === eq.questionId.toString())?.answer,
    }));
    
    if (exam.shuffleQuestions) {
      questions = shuffleArray(questions);
    }
    
    if (exam.shuffleOptions) {
      questions = questions.map((q: any) => {
        if (q.options) {
          return { ...q, options: shuffleArray(q.options) };
        }
        return q;
      });
    }
    
    res.json({
      success: true,
      data: {
        exam: {
          _id: exam._id,
          title: exam.title,
          totalScore: exam.totalScore,
          duration: exam.duration,
          endTime: exam.endTime,
        },
        questions: questions.map((q: any) => ({
          _id: q._id,
          type: q.type,
          content: q.content,
          options: q.options,
          score: q.examScore,
          userAnswer: q.userAnswer,
        })),
        startTime: record.createdAt,
        status: record.status,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const saveAnswer = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const { examId, questionId } = req.params;
    const { answer } = req.body;
    
    const record = await ExamRecord.findOne({ examId, studentId: req.user.id });
    if (!record || record.status !== 'in_progress') {
      return res.status(400).json({ message: '考试未进行中' });
    }
    
    const answerIndex = record.answers.findIndex(
      a => a.questionId.toString() === questionId
    );
    
    if (answerIndex === -1) {
      return res.status(404).json({ message: '题目不存在' });
    }
    
    record.answers[answerIndex].answer = answer;
    await record.save();
    
    res.json({ success: true, message: '答案已保存' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const recordSwitchTab = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const { examId } = req.params;
    
    const record = await ExamRecord.findOne({ examId, studentId: req.user.id });
    if (record) {
      record.switchTabCount += 1;
      await record.save();
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const submitExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const { examId } = req.params;
    const studentId = req.user.id;
    
    const record = await ExamRecord.findOne({ examId, studentId });
    if (!record || record.status !== 'in_progress') {
      return res.status(400).json({ message: '无法提交' });
    }
    
    const exam = await Exam.findById(examId).populate('questions.questionId');
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' });
    }
    
    let totalObtainedScore = 0;
    const wrongQuestions: any[] = [];
    
    for (const answer of record.answers) {
      const question = await Question.findById(answer.questionId);
      if (!question) continue;
      
      const examQuestion = exam.questions.find(
        eq => eq.questionId.toString() === answer.questionId.toString()
      );
      const questionScore = examQuestion?.score || question.score;
      
      if (['single', 'multiple', 'truefalse'].includes(question.type)) {
        const isCorrect = compareAnswers(answer.answer, question.answer);
        answer.isCorrect = isCorrect;
        answer.score = isCorrect ? questionScore : 0;
        
        if (!isCorrect) {
          wrongQuestions.push({
            studentId,
            questionId: question._id,
            examRecordId: record._id,
            userAnswer: answer.answer,
          });
        }
        
        totalObtainedScore += answer.score;
      } else {
        answer.score = 0;
        answer.isCorrect = false;
      }
    }
    
    record.obtainedScore = totalObtainedScore;
    record.status = 'submitted';
    record.submittedAt = new Date();
    
    const startTime = record.createdAt.getTime();
    record.timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    await record.save();
    
    if (wrongQuestions.length > 0) {
      for (const wq of wrongQuestions) {
        await WrongQuestion.updateOne(
          { studentId: wq.studentId, questionId: wq.questionId },
          { $set: wq },
          { upsert: true }
        );
      }
    }
    
    const redis = getRedisClient();
    await redis.del(`exam:${examId}:student:${studentId}`);
    
    res.json({
      success: true,
      data: {
        obtainedScore: totalObtainedScore,
        totalScore: record.totalScore,
        message: '考试提交成功',
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyExamRecords = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const records = await ExamRecord.find({ studentId: req.user.id })
      .populate({
        path: 'examId',
        select: 'title subject totalScore duration startTime endTime',
      })
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: records });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getExamRecord = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const { id } = req.params;
    
    const record = await ExamRecord.findById(id)
      .populate('examId')
      .populate('answers.questionId');
    
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }
    
    if (req.user.role === 'student' && record.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: '无权查看' });
    }
    
    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getExamResults = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ message: '仅教师可查看' });
    }
    
    const { examId } = req.params;
    
    const records = await ExamRecord.find({ examId, status: { $in: ['submitted', 'graded'] } })
      .populate('studentId', 'name email')
      .sort({ obtainedScore: -1 });
    
    if (records.length === 0) {
      return res.json({
        success: true,
        data: {
          records: [],
          stats: {
            total: 0,
            submitted: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            passRate: 0,
            scoreDistribution: {},
          },
        },
      });
    }
    
    const scores = records.map(r => r.obtainedScore);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passCount = scores.filter(s => s >= 60).length;
    const passRate = (passCount / scores.length) * 100;
    
    res.json({
      success: true,
      data: {
        records,
        stats: {
          total: records.length,
          submitted: records.length,
          averageScore: Math.round(averageScore * 100) / 100,
          highestScore,
          lowestScore,
          passRate: Math.round(passRate * 100) / 100,
          scoreDistribution: calculateScoreDistribution(scores),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const gradeSubjectiveQuestion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ message: '仅教师可批改' });
    }
    
    const { recordId, questionId } = req.params;
    const { score } = req.body;
    
    const record = await ExamRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }
    
    const answerIndex = record.answers.findIndex(
      a => a.questionId.toString() === questionId
    );
    
    if (answerIndex === -1) {
      return res.status(404).json({ message: '题目不存在' });
    }
    
    const exam = await Exam.findById(record.examId);
    const examQuestion = exam?.questions.find(
      eq => eq.questionId.toString() === questionId
    );
    
    if (examQuestion && score > examQuestion.score) {
      return res.status(400).json({ message: '分数不能超过题目分值' });
    }
    
    record.answers[answerIndex].score = score;
    record.answers[answerIndex].isCorrect = score > 0;
    record.obtainedScore = record.answers.reduce((sum, a) => sum + (a.score || 0), 0);
    
    await record.save();
    
    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
