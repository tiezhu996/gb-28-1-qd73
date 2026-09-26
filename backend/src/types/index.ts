import { Types } from 'mongoose';
import { Request } from 'express';

export type UserRole = 'teacher' | 'student';

export type QuestionType = 'single' | 'multiple' | 'truefalse' | 'fill' | 'essay';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type ExamStatus = 'draft' | 'published' | 'ongoing' | 'ended';

export type ExamRecordStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOption {
  key: string;
  content: string;
  isCorrect?: boolean;
}

export interface IQuestion {
  _id: Types.ObjectId;
  type: QuestionType;
  subject: string;
  knowledgePoints: string[];
  difficulty: DifficultyLevel;
  score: number;
  content: string;
  options?: IOption[];
  answer: string | string[];
  explanation?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExamQuestion {
  questionId: Types.ObjectId;
  order: number;
  score: number;
}

export interface IKnowledgeRequirement {
  knowledgePoint: string;
  minCount: number;
}

export interface IAutoGroupRule {
  type?: QuestionType | '';
  difficulty?: DifficultyLevel | '';
  count: number;
  /** 每题分值 */
  scorePerQuestion: number;
  /** 必考知识点及至少抽中的条数 */
  knowledgeRequirements?: IKnowledgeRequirement[];
}

export type AutoGroupShortfallKind = 'rule' | 'knowledge';

export interface IAutoGroupShortfall {
  /** rule: 题型/难度条数不足；knowledge: 必考知识点条数不足 */
  kind: AutoGroupShortfallKind;
  ruleIndex: number;
  ruleLabel: string;
  knowledgePoint?: string;
  need: number;
  available: number;
  short: number;
  message: string;
}

export interface IExam {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  subject: string;
  totalScore: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  status: ExamStatus;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: IExamQuestion[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnswer {
  questionId: Types.ObjectId;
  answer: string | string[];
  score?: number;
  isCorrect?: boolean;
}

export interface IExamRecord {
  _id: Types.ObjectId;
  examId: Types.ObjectId;
  studentId: Types.ObjectId;
  answers: IAnswer[];
  totalScore: number;
  obtainedScore: number;
  timeSpent: number;
  switchTabCount: number;
  submittedAt?: Date;
  status: ExamRecordStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWrongQuestion {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  questionId: Types.ObjectId;
  examRecordId?: Types.ObjectId;
  userAnswer: string | string[];
  createdAt: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    name: string;
  };
}

export interface JwtPayload {
  id: string;
  role: UserRole;
  name: string;
}
