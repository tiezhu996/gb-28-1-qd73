import mongoose, { Schema, Document, Types } from 'mongoose';
import { IWrongQuestion } from '../types';

export interface IWrongQuestionDocument extends IWrongQuestion, Document {}

const wrongQuestionSchema = new Schema<IWrongQuestionDocument>({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questionId: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  examRecordId: {
    type: Schema.Types.ObjectId,
    ref: 'ExamRecord',
  },
  userAnswer: {
    type: Schema.Types.Mixed,
    required: true,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

wrongQuestionSchema.index({ studentId: 1, questionId: 1 }, { unique: true });

export const WrongQuestion = mongoose.model<IWrongQuestionDocument>('WrongQuestion', wrongQuestionSchema);
