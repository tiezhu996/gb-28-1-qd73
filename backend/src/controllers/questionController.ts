import { Request, Response } from 'express';
import XLSX from 'xlsx';
import { Question } from '../models/Question';
import { AuthRequest, QuestionType, DifficultyLevel } from '../types';

export const getQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { subject, type, difficulty, knowledgePoint, page = 1, limit = 20 } = req.query;
    
    const query: any = {};
    if (subject) query.subject = subject;
    if (type) query.type = type;
    if (difficulty) query.difficulty = difficulty;
    if (knowledgePoint) query.knowledgePoints = { $in: [knowledgePoint] };
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name');
    
    const total = await Question.countDocuments(query);
    
    res.json({
      success: true,
      data: questions,
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

export const getQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id).populate('createdBy', 'name');
    
    if (!question) {
      return res.status(404).json({ message: '题目不存在' });
    }
    
    res.json({ success: true, data: question });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createQuestion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const questionData = req.body;
    questionData.createdBy = req.user.id;
    
    const question = await Question.create(questionData);
    
    res.status(201).json({ success: true, data: question });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const question = await Question.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!question) {
      return res.status(404).json({ message: '题目不存在' });
    }
    
    res.json({ success: true, data: question });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const question = await Question.findByIdAndDelete(id);
    
    if (!question) {
      return res.status(404).json({ message: '题目不存在' });
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const importQuestions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: '请上传Excel文件' });
    }
    
    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const typeMap: Record<string, QuestionType> = {
      '单选题': 'single',
      '多选题': 'multiple',
      '判断题': 'truefalse',
      '填空题': 'fill',
      '简答题': 'essay',
    };
    
    const difficultyMap: Record<string, DifficultyLevel> = {
      '简单': 'easy',
      '中等': 'medium',
      '困难': 'hard',
    };
    
    const questions = data.map((row: any) => {
      const type = typeMap[row['类型']] || 'single';
      const difficulty = difficultyMap[row['难度']] || 'medium';
      
      const baseQuestion: any = {
        type,
        subject: row['学科'] || '默认学科',
        knowledgePoints: row['知识点'] ? row['知识点'].split(',').map((s: string) => s.trim()) : [],
        difficulty,
        score: Number(row['分值']) || 2,
        content: row['题目内容'],
        explanation: row['解析'] || '',
        createdBy: req.user!.id,
      };
      
      if (type === 'single' || type === 'multiple') {
        baseQuestion.options = [
          { key: 'A', content: row['选项A'] || '' },
          { key: 'B', content: row['选项B'] || '' },
          { key: 'C', content: row['选项C'] || '' },
          { key: 'D', content: row['选项D'] || '' },
        ].filter((opt: any) => opt.content);
        
        const answer = row['答案'] || '';
        baseQuestion.answer = type === 'multiple' 
          ? answer.split('').map((s: string) => s.trim())
          : answer.trim();
      } else if (type === 'truefalse') {
        baseQuestion.answer = row['答案'] === '正确' ? 'true' : 'false';
      } else {
        baseQuestion.answer = row['答案'] || '';
      }
      
      return baseQuestion;
    });
    
    const created = await Question.insertMany(questions);
    
    res.json({
      success: true,
      message: `成功导入 ${created.length} 道题目`,
      count: created.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await Question.distinct('subject');
    res.json({ success: true, data: subjects });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getKnowledgePoints = async (req: AuthRequest, res: Response) => {
  try {
    const { subject } = req.query;
    const query: any = {};
    if (subject) query.subject = subject;
    
    const questions = await Question.find(query, 'knowledgePoints');
    const allPoints = new Set<string>();
    
    questions.forEach((q) => {
      q.knowledgePoints.forEach((p) => allPoints.add(p));
    });
    
    res.json({ success: true, data: Array.from(allPoints) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
