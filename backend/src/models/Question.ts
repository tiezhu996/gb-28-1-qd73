import mongoose, { Schema, Document, Types } from 'mongoose';
import { IQuestion, QuestionType, DifficultyLevel, IOption } from '../types';

export interface IQuestionDocument extends IQuestion, Document {}

const optionSchema = new Schema<IOption>({
  key: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const questionSchema = new Schema<IQuestionDocument>({
  type: {
    type: String,
    enum: ['single', 'multiple', 'truefalse', 'fill', 'essay'] as QuestionType[],
    required: [true, '题目类型不能为空'],
  },
  subject: {
    type: String,
    required: [true, '学科不能为空'],
    trim: true,
  },
  knowledgePoints: [{
    type: String,
    trim: true,
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'] as DifficultyLevel[],
    default: 'medium',
  },
  score: {
    type: Number,
    required: [true, '分值不能为空'],
    min: [1, '分值不能小于1'],
  },
  content: {
    type: String,
    required: [true, '题目内容不能为空'],
    trim: true,
  },
  options: [optionSchema],
  answer: {
    type: Schema.Types.Mixed,
    required: [true, '答案不能为空'],
  },
  explanation: {
    type: String,
    default: '',
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

questionSchema.index({ subject: 1, type: 1, difficulty: 1 });
questionSchema.index({ knowledgePoints: 1 });
questionSchema.index({ createdBy: 1 });

export const Question = mongoose.model<IQuestionDocument>('Question', questionSchema);
