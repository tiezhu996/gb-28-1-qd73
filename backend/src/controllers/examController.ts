import { Request, Response } from 'express';
import { Exam } from '../models/Exam';
import { Question } from '../models/Question';
import {
  AuthRequest,
  ExamStatus,
  DifficultyLevel,
  QuestionType,
  IAutoGenerateRule,
  IAutoGenerateShortage,
} from '../types';
import { shuffleArray } from '../utils/helpers';

const questionTypeLabels: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  truefalse: '判断题',
  fill: '填空题',
  essay: '简答题',
};

const difficultyLabels: Record<DifficultyLevel, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const describeRule = (rule: IAutoGenerateRule): string => {
  const parts: string[] = [];
  parts.push(rule.type ? questionTypeLabels[rule.type] : '全部题型');
  parts.push(rule.difficulty ? difficultyLabels[rule.difficulty] : '全部难度');
  if (rule.knowledgePoints && rule.knowledgePoints.length > 0) {
    parts.push(`知识点「${rule.knowledgePoints.join('、')}」`);
  }
  return parts.join(' / ');
};

const buildShortageMessage = (
  shortages: IAutoGenerateShortage[],
  rules: IAutoGenerateRule[]
): string => {
  const details = shortages.map((s) => {
    const rule = rules[s.rule - 1];
    return `规则${s.rule}（${describeRule(rule)}）：还差 ${s.missing} 道（需要 ${s.required} 道，去重后仅剩 ${s.available} 道）`;
  });
  return `题库题目不足，无法组卷：${details.join('；')}`;
};

// 归一化后的规则：知识点与最少抽题数一定有值
type NormalizedRule = IAutoGenerateRule & {
  knowledgePoints: string[];
  minKnowledgePointCount: number;
};

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

    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ message: '组卷规则不能为空' });
    }

    const normalizedRules: NormalizedRule[] = rules.map((rule: any) => ({
      type: rule.type || '',
      difficulty: rule.difficulty || '',
      knowledgePoints: Array.isArray(rule.knowledgePoints)
        ? rule.knowledgePoints.map((p: string) => String(p).trim()).filter(Boolean)
        : [],
      minKnowledgePointCount: Number(rule.minKnowledgePointCount) || 0,
      count: Number(rule.count),
      scorePerQuestion: Number(rule.scorePerQuestion),
    }));

    for (let i = 0; i < normalizedRules.length; i++) {
      const rule = normalizedRules[i];
      if (!Number.isInteger(rule.count) || rule.count < 1) {
        return res.status(400).json({ message: `规则${i + 1}的题目数量必须大于0` });
      }
      if (!Number.isFinite(rule.scorePerQuestion) || rule.scorePerQuestion < 1) {
        return res.status(400).json({ message: `规则${i + 1}的每题分值必须大于0` });
      }
      if (rule.minKnowledgePointCount > rule.count) {
        return res.status(400).json({
          message: `规则${i + 1}的必考知识点抽题数不能超过规则总题数`,
        });
      }
    }

    // 整份卷子范围内去重：被前面规则抽走的题不能再被后面的规则抽到
    const usedIds = new Set<string>();
    const questions: any[] = [];
    let totalScore = 0;
    const shortages: IAutoGenerateShortage[] = [];

    for (let i = 0; i < normalizedRules.length; i++) {
      const rule = normalizedRules[i];

      const query: any = { subject };
      if (rule.type) query.type = rule.type;
      if (rule.difficulty) query.difficulty = rule.difficulty;

      const candidates = await Question.find(query);
      const available = candidates.filter((q) => !usedIds.has(q._id.toString()));

      // 先看去掉前面规则已占用的题后，该条件下总数还够不够
      if (available.length < rule.count) {
        shortages.push({
          rule: i + 1,
          type: rule.type,
          difficulty: rule.difficulty,
          knowledgePoints: [],
          required: rule.count,
          available: available.length,
          missing: rule.count - available.length,
        });
        // 该规则未抽题，不占用题库，继续检查其余规则以便一次报全所有缺口
        continue;
      }

      let selected: typeof available;

      if (rule.knowledgePoints.length > 0 && rule.minKnowledgePointCount > 0) {
        const coversRequired = (q: any) =>
          q.knowledgePoints.some((p: string) => rule.knowledgePoints.includes(p));

        const kpPool = shuffleArray(available.filter(coversRequired));
        const otherPool = shuffleArray(available.filter((q) => !coversRequired(q)));

        // 必考知识点至少抽到的条数凑不齐时，明确报出知识点缺口
        if (kpPool.length < rule.minKnowledgePointCount) {
          shortages.push({
            rule: i + 1,
            type: rule.type,
            difficulty: rule.difficulty,
            knowledgePoints: rule.knowledgePoints,
            required: rule.minKnowledgePointCount,
            available: kpPool.length,
            missing: rule.minKnowledgePointCount - kpPool.length,
          });
          continue;
        }

        const kpSelected = kpPool.slice(0, rule.minKnowledgePointCount);
        const restPool = shuffleArray([...kpPool.slice(rule.minKnowledgePointCount), ...otherPool]);
        selected = [...kpSelected, ...restPool.slice(0, rule.count - kpSelected.length)];
      } else {
        selected = shuffleArray(available).slice(0, rule.count);
      }

      selected.forEach((q) => {
        usedIds.add(q._id.toString());
        questions.push({
          questionId: q._id,
          order: questions.length + 1,
          score: rule.scorePerQuestion,
        });
        totalScore += rule.scorePerQuestion;
      });
    }

    // 任何一个条件凑不齐都挡下这次组卷，不创建考试
    if (shortages.length > 0) {
      return res.status(400).json({
        message: buildShortageMessage(shortages, normalizedRules),
        shortages,
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
