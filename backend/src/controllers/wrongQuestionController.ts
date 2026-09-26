import { Response } from 'express';
import { WrongQuestion } from '../models/WrongQuestion';
import { AuthRequest } from '../types';

export const getWrongQuestions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const { knowledgePoint, page = 1, limit = 20 } = req.query;
    
    const query: any = { studentId: req.user.id };
    
    let pipeline: any[] = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
    ];
    
    if (knowledgePoint) {
      pipeline.push({
        $match: { 'question.knowledgePoints': knowledgePoint },
      });
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    pipeline = pipeline.concat([
      { $skip: skip },
      { $limit: Number(limit) },
    ]);
    
    const wrongQuestions = await WrongQuestion.aggregate(pipeline);
    
    const totalQuery: any[] = [
      { $match: query },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
    ];
    
    if (knowledgePoint) {
      totalQuery.push({
        $match: { 'question.knowledgePoints': knowledgePoint },
      });
    }
    totalQuery.push({ $count: 'total' });
    
    const totalResult = await WrongQuestion.aggregate(totalQuery);
    const total = totalResult[0]?.total || 0;
    
    res.json({
      success: true,
      data: wrongQuestions,
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

export const addWrongQuestion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const { questionId, userAnswer } = req.body;
    
    const existing = await WrongQuestion.findOne({
      studentId: req.user.id,
      questionId,
    });
    
    if (existing) {
      return res.status(400).json({ message: '该题目已在错题本中' });
    }
    
    const wrongQuestion = await WrongQuestion.create({
      studentId: req.user.id,
      questionId,
      userAnswer,
    });
    
    res.status(201).json({ success: true, data: wrongQuestion });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const removeWrongQuestion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const { id } = req.params;
    
    const result = await WrongQuestion.findOneAndDelete({
      _id: id,
      studentId: req.user.id,
    });
    
    if (!result) {
      return res.status(404).json({ message: '错题不存在' });
    }
    
    res.json({ success: true, message: '已从错题本移除' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWrongQuestionStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const pipeline = [
      { $match: { studentId: req.user.id } },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          bySubject: {
            $push: {
              k: '$question.subject',
              v: 1,
            },
          },
          byKnowledgePoint: {
            $push: '$question.knowledgePoints',
          },
          byDifficulty: {
            $push: {
              k: '$question.difficulty',
              v: 1,
            },
          },
        },
      },
    ];
    
    const result = await WrongQuestion.aggregate(pipeline);
    
    if (result.length === 0) {
      return res.json({
        success: true,
        data: {
          total: 0,
          bySubject: {},
          byKnowledgePoint: {},
          byDifficulty: {},
        },
      });
    }
    
    const stats = result[0];
    
    const bySubject: Record<string, number> = {};
    stats.bySubject.forEach((item: any) => {
      bySubject[item.k] = (bySubject[item.k] || 0) + item.v;
    });
    
    const byKnowledgePoint: Record<string, number> = {};
    stats.byKnowledgePoint.forEach((points: string[]) => {
      points.forEach(p => {
        byKnowledgePoint[p] = (byKnowledgePoint[p] || 0) + 1;
      });
    });
    
    const byDifficulty: Record<string, number> = {};
    stats.byDifficulty.forEach((item: any) => {
      byDifficulty[item.k] = (byDifficulty[item.k] || 0) + item.v;
    });
    
    res.json({
      success: true,
      data: {
        total: stats.total,
        bySubject,
        byKnowledgePoint,
        byDifficulty,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
