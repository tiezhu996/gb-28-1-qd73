import { Request, Response } from 'express';
import { Exam } from '../models/Exam';
import { Question } from '../models/Question';
import { AuthRequest, ExamStatus, DifficultyLevel, QuestionType } from '../types';
import { shuffleArray } from '../utils/helpers';

export const getExams = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const { status, subject, page = 1, limit = 20 } = req.query;
    
    const query: any = {};
    if (req.user.role === 'teacher') {
      query.createdBy = req.user.id;
    }
    if (status) query.status = status;
    if (subject) query.subject = subject;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const exams = await Exam.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name');
    
    const total = await Exam.countDocuments(query);
    
    res.json({
      success: true,
      data: exams,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id)
      .populate('createdBy', 'name')
      .populate('questions.questionId');
    
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' });
    }
    
    res.json({ success: true, data: exam });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const examData = req.body;
    examData.createdBy = req.user.id;
    
    const exam = await Exam.create(examData);
    
    res.status(201).json({ success: true, data: exam });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const autoGenerateExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const {
      title,
      description,
      subject,
      duration,
      startTime,
      endTime,
      shuffleQuestions = true,
      shuffleOptions = true,
      rules,
    } = req.body;
    
    const questions: any[] = [];
    let totalScore = 0;
    
    for (const rule of rules) {
      const { type, difficulty, count, scorePerQuestion } = rule;
      
      const query: any = { subject };
      if (type) query.type = type;
      if (difficulty) query.difficulty = difficulty;
      
      const availableQuestions = await Question.find(query);
      
      if (availableQuestions.length < count) {
        return res.status(400).json({
          message: `题目数量不足：${type || '所有题型'} - ${difficulty || '所有难度'} 仅有 ${availableQuestions.length} 道，需要 ${count} 道`,
        });
      }
      
      const selected = shuffleArray(availableQuestions).slice(0, count);
      
      selected.forEach((q, index) => {
        questions.push({
          questionId: q._id,
          order: questions.length + 1,
          score: scorePerQuestion,
        });
        totalScore += scorePerQuestion;
      });
    }
    
    const exam = await Exam.create({
      title,
      description,
      subject,
      totalScore,
      duration,
      startTime,
      endTime,
      status: 'draft' as ExamStatus,
      shuffleQuestions,
      shuffleOptions,
      questions,
      createdBy: req.user.id,
    });
    
    res.status(201).json({ success: true, data: exam });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const exam = await Exam.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' });
    }
    
    res.json({ success: true, data: exam });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const exam = await Exam.findByIdAndDelete(id);
    
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' });
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const publishExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const exam = await Exam.findByIdAndUpdate(
      id,
      { status: 'published' },
      { new: true }
    );
    
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' });
    }
    
    res.json({ success: true, data: exam });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
