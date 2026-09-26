import mongoose, { Schema, Document, Types } from 'mongoose';
import { IExamRecord, IAnswer, ExamRecordStatus } from '../types';

export interface IExamRecordDocument extends IExamRecord, Document {}

const answerSchema = new Schema<IAnswer>({
  questionId: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  answer: {
    type: Schema.Types.Mixed,
    default: '',
  },
  score: {
    type: Number,
    default: 0,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const examRecordSchema = new Schema<IExamRecordDocument>({
  examId: {
    type: Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  answers: [answerSchema],
  totalScore: {
    type: Number,
    default: 0,
  },
  obtainedScore: {
    type: Number,
    default: 0,
  },
  timeSpent: {
    type: Number,
    default: 0,
  },
  switchTabCount: {
    type: Number,
    default: 0,
  },
  submittedAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'submitted', 'graded'] as ExamRecordStatus[],
    default: 'not_started',
  },
}, {
  timestamps: true,
});

examRecordSchema.index({ examId: 1, studentId: 1 }, { unique: true });
examRecordSchema.index({ studentId: 1 });
examRecordSchema.index({ status: 1 });

export const ExamRecord = mongoose.model<IExamRecordDocument>('ExamRecord', examRecordSchema);
