import mongoose, { Schema, Document, Types } from 'mongoose';
import { IExam, IExamQuestion, ExamStatus } from '../types';

export interface IExamDocument extends IExam, Document {}

const examQuestionSchema = new Schema<IExamQuestion>({
  questionId: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  order: {
    type: Number,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
}, { _id: false });

const examSchema = new Schema<IExamDocument>({
  title: {
    type: String,
    required: [true, '考试标题不能为空'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  subject: {
    type: String,
    required: [true, '学科不能为空'],
    trim: true,
  },
  totalScore: {
    type: Number,
    required: [true, '总分不能为空'],
    min: [0, '总分不能为负数'],
  },
  duration: {
    type: Number,
    required: [true, '考试时长不能为空（分钟）'],
    min: [1, '考试时长至少1分钟'],
  },
  startTime: {
    type: Date,
    required: [true, '开始时间不能为空'],
  },
  endTime: {
    type: Date,
    required: [true, '结束时间不能为空'],
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'ended'] as ExamStatus[],
    default: 'draft',
  },
  shuffleQuestions: {
    type: Boolean,
    default: false,
  },
  shuffleOptions: {
    type: Boolean,
    default: false,
  },
  questions: [examQuestionSchema],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

examSchema.index({ createdBy: 1 });
examSchema.index({ subject: 1, status: 1 });
examSchema.index({ startTime: 1, endTime: 1 });

export const Exam = mongoose.model<IExamDocument>('Exam', examSchema);
