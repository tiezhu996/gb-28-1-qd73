import { Router } from 'express';
import multer from 'multer';
import {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestions,
  getSubjects,
  getKnowledgePoints,
} from '../controllers/questionController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/subjects', authMiddleware, getSubjects);
router.get('/knowledge-points', authMiddleware, getKnowledgePoints);

router.get('/', authMiddleware, getQuestions);
router.get('/:id', authMiddleware, getQuestion);

router.use(authMiddleware, requireRole('teacher'));

router.post('/', createQuestion);
router.post('/import', upload.single('file'), importQuestions);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);

export default router;
