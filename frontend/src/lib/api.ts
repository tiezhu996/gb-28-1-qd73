import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

const api = axios.create({
  baseURL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (name: string, email: string, password: string, role: string = 'student') =>
    api.post('/auth/register', { name, email, password, role }),
  
  getMe: () => api.get('/auth/me'),
};

export const questionAPI = {
  getQuestions: (params?: any) =>
    api.get('/questions', { params }),
  
  getQuestion: (id: string) =>
    api.get(`/questions/${id}`),
  
  createQuestion: (data: any) =>
    api.post('/questions', data),
  
  updateQuestion: (id: string, data: any) =>
    api.put(`/questions/${id}`, data),
  
  deleteQuestion: (id: string) =>
    api.delete(`/questions/${id}`),
  
  importQuestions: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/questions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  getSubjects: () => api.get('/questions/subjects'),
  
  getKnowledgePoints: (params?: any) =>
    api.get('/questions/knowledge-points', { params }),
};

export const examAPI = {
  getExams: (params?: any) =>
    api.get('/exams', { params }),
  
  getExam: (id: string) =>
    api.get(`/exams/${id}`),
  
  createExam: (data: any) =>
    api.post('/exams', data),
  
  autoGenerateExam: (data: any) =>
    api.post('/exams/auto-generate', data),
  
  updateExam: (id: string, data: any) =>
    api.put(`/exams/${id}`, data),
  
  deleteExam: (id: string) =>
    api.delete(`/exams/${id}`),
  
  publishExam: (id: string) =>
    api.post(`/exams/${id}/publish`),
};

export const examRecordAPI = {
  startExam: (examId: string) =>
    api.post(`/exam-records/${examId}/start`),
  
  saveAnswer: (examId: string, questionId: string, answer: any) =>
    api.put(`/exam-records/${examId}/answer/${questionId}`, { answer }),
  
  recordSwitchTab: (examId: string) =>
    api.post(`/exam-records/${examId}/switch-tab`),
  
  submitExam: (examId: string) =>
    api.post(`/exam-records/${examId}/submit`),
  
  getMyExamRecords: () =>
    api.get('/exam-records/my'),
  
  getExamRecord: (id: string) =>
    api.get(`/exam-records/${id}`),
  
  getExamResults: (examId: string) =>
    api.get(`/exam-records/results/${examId}`),
  
  gradeQuestion: (recordId: string, questionId: string, score: number) =>
    api.put(`/exam-records/${recordId}/grade/${questionId}`, { score }),
};

export const wrongQuestionAPI = {
  getWrongQuestions: (params?: any) =>
    api.get('/wrong-questions', { params }),
  
  getStats: () =>
    api.get('/wrong-questions/stats'),
  
  addWrongQuestion: (questionId: string, userAnswer: any) =>
    api.post('/wrong-questions', { questionId, userAnswer }),
  
  removeWrongQuestion: (id: string) =>
    api.delete(`/wrong-questions/${id}`),
};

export default api;
