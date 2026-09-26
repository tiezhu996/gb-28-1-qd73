export type UserRole = 'teacher' | 'student';

export type QuestionType = 'single' | 'multiple' | 'truefalse' | 'fill' | 'essay';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type ExamStatus = 'draft' | 'published' | 'ongoing' | 'ended';

export type ExamRecordStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Option {
  key: string;
  content: string;
  isCorrect?: boolean;
}

export interface Question {
  _id: string;
  type: QuestionType;
  subject: string;
  knowledgePoints: string[];
  difficulty: DifficultyLevel;
  score: number;
  content: string;
  options?: Option[];
  answer?: string | string[];
  explanation?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestion {
  questionId: string | Question;
  order: number;
  score: number;
}

export interface KnowledgeRequirement {
  knowledgePoint: string;
  minCount: number;
}

export interface AutoGroupRule {
  type: QuestionType | '';
  difficulty: DifficultyLevel | '';
  count: number;
  scorePerQuestion: number;
  knowledgeRequirements: KnowledgeRequirement[];
}

export type AutoGroupShortfallKind = 'rule' | 'knowledge';

export interface AutoGroupShortfall {
  kind: AutoGroupShortfallKind;
  ruleIndex: number;
  ruleLabel: string;
  knowledgePoint?: string;
  need: number;
  available: number;
  short: number;
  message: string;
}

export interface AutoGroupValidation {
  success: boolean;
  feasible: boolean;
  totalQuestions?: number;
  totalScore?: number;
  shortfalls?: AutoGroupShortfall[];
}

export interface Exam {
  _id: string;
  title: string;
  description?: string;
  subject: string;
  totalScore: number;
  duration: number;
  startTime: string;
  endTime: string;
  status: ExamStatus;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: ExamQuestion[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  questionId: string;
  answer: string | string[];
  score?: number;
  isCorrect?: boolean;
}

export interface ExamRecord {
  _id: string;
  examId: string | Exam;
  studentId: string | User;
  answers: Answer[];
  totalScore: number;
  obtainedScore: number;
  timeSpent: number;
  switchTabCount: number;
  submittedAt?: string;
  status: ExamRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WrongQuestion {
  _id: string;
  studentId: string;
  questionId: string | Question;
  examRecordId?: string;
  userAnswer: string | string[];
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ExamStats {
  total: number;
  submitted: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  scoreDistribution: Record<string, number>;
}
