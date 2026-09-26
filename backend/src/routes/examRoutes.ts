import { Router } from 'express';
import {
  getExams,
  getExam,
  createExam,
  autoGenerateExam,
  validateAutoGenerate,
  updateExam,
  deleteExam,
  publishExam,
} from '../controllers/examController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, getExams);
router.get('/:id', authMiddleware, getExam);

router.use(authMiddleware, requireRole('teacher'));

router.post('/', createExam);
router.post('/auto-generate/validate', validateAutoGenerate);
router.post('/auto-generate', autoGenerateExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);
router.post('/:id/publish', publishExam);

export default router;
