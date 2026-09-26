import { Router } from 'express';
import {
  getWrongQuestions,
  addWrongQuestion,
  removeWrongQuestion,
  getWrongQuestionStats,
} from '../controllers/wrongQuestionController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware, requireRole('student'));

router.get('/', getWrongQuestions);
router.get('/stats', getWrongQuestionStats);
router.post('/', addWrongQuestion);
router.delete('/:id', removeWrongQuestion);

export default router;
