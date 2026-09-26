import { Request, Response } from 'express';
import { Exam } from '../models/Exam';
import { AuthRequest, ExamStatus } from '../types';
import { AutoGroupError, planAutoExam } from '../services/autoExamService';

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

    if (!subject) {
      return res.status(400).json({ message: '学科不能为空' });
    }
    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ message: '组卷规则不能为空' });
    }

    // 全局去重抽题；必考知识点/条数凑不齐时直接挡下，不生成试卷
    const { questions: planned, totalScore } = await planAutoExam({ subject, rules });

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
      questions: planned.map((q, index) => ({
        questionId: q.questionId,
        order: index + 1,
        score: q.score,
      })),
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: exam });
  } catch (error: any) {
    if (error instanceof AutoGroupError) {
      return res.status(400).json({
        message: '组卷条件无法满足，无法生成试卷',
        shortfalls: error.shortfalls,
      });
    }
    res.status(500).json({ message: error.message });
  }
};

/** 组卷预检：只校验题库能否满足全部规则（含必考知识点），不创建试卷，供建卷页实时展示缺口 */
export const validateAutoGenerate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }

    const { subject, rules } = req.body;

    if (!subject) {
      return res.status(400).json({ message: '学科不能为空' });
    }
    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ message: '组卷规则不能为空' });
    }

    const { questions, totalScore } = await planAutoExam({ subject, rules });

    res.json({
      success: true,
      feasible: true,
      totalQuestions: questions.length,
      totalScore,
    });
  } catch (error: any) {
    if (error instanceof AutoGroupError) {
      return res.status(200).json({
        success: true,
        feasible: false,
        shortfalls: error.shortfalls,
      });
    }
    res.status(400).json({ message: error.message });
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
