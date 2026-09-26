import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/exam_system',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  
  defaultTeacher: {
    email: process.env.DEFAULT_TEACHER_EMAIL || 'teacher@example.com',
    password: process.env.DEFAULT_TEACHER_PASSWORD || 'teacher123456',
  },
  
  defaultStudent: {
    email: process.env.DEFAULT_STUDENT_EMAIL || 'student@example.com',
    password: process.env.DEFAULT_STUDENT_PASSWORD || 'student123456',
  },
};
