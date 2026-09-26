import { Router } from 'express';
import {
  startExam,
  saveAnswer,
  recordSwitchTab,
  submitExam,
  getMyExamRecords,
  getExamRecord,
  getExamResults,
  gradeSubjectiveQuestion,
} from '../controllers/examRecordController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/:examId/start', requireRole('student'), startExam);
router.put('/:examId/answer/:questionId', requireRole('student'), saveAnswer);
router.post('/:examId/switch-tab', requireRole('student'), recordSwitchTab);
router.post('/:examId/submit', requireRole('student'), submitExam);

router.get('/my', requireRole('student'), getMyExamRecords);
router.get('/:id', getExamRecord);

router.get('/results/:examId', requireRole('teacher'), getExamResults);
router.put('/:recordId/grade/:questionId', requireRole('teacher'), gradeSubjectiveQuestion);

export default router;
