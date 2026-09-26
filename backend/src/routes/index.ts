import { Router } from 'express';
import authRoutes from './authRoutes';
import questionRoutes from './questionRoutes';
import examRoutes from './examRoutes';
import examRecordRoutes from './examRecordRoutes';
import wrongQuestionRoutes from './wrongQuestionRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/questions', questionRoutes);
router.use('/exams', examRoutes);
router.use('/exam-records', examRecordRoutes);
router.use('/wrong-questions', wrongQuestionRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
