import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { User } from './models/User';
import { Question } from './models/Question';
import { Exam } from './models/Exam';
import { config } from './config';

dotenv.config();

const subjects = ['高等数学', '线性代数', '数据结构', '计算机网络'];
const knowledgePoints = {
  '高等数学': ['极限', '导数', '积分', '微分方程'],
  '线性代数': ['矩阵', '行列式', '特征值', '向量空间'],
  '数据结构': ['数组', '链表', '树', '图', '排序'],
  '计算机网络': ['OSI模型', 'TCP/IP', 'HTTP', '路由'],
};

const sampleQuestions = [
  {
    type: 'single' as const,
    content: '下列哪个不是JavaScript的基本数据类型？',
    options: [
      { key: 'A', content: 'String', isCorrect: false },
      { key: 'B', content: 'Number', isCorrect: false },
      { key: 'C', content: 'Array', isCorrect: true },
      { key: 'D', content: 'Boolean', isCorrect: false },
    ],
    answer: 'C',
    score: 2,
  },
  {
    type: 'single' as const,
    content: '在JavaScript中，typeof null 的返回值是什么？',
    options: [
      { key: 'A', content: 'null', isCorrect: false },
      { key: 'B', content: 'undefined', isCorrect: false },
      { key: 'C', content: 'object', isCorrect: true },
      { key: 'D', content: 'boolean', isCorrect: false },
    ],
    answer: 'C',
    score: 2,
  },
  {
    type: 'multiple' as const,
    content: '以下哪些是HTTP请求方法？',
    options: [
      { key: 'A', content: 'GET', isCorrect: true },
      { key: 'B', content: 'POST', isCorrect: true },
      { key: 'C', content: 'PUSH', isCorrect: false },
      { key: 'D', content: 'DELETE', isCorrect: true },
    ],
    answer: ['A', 'B', 'D'],
    score: 3,
  },
  {
    type: 'truefalse' as const,
    content: 'JavaScript是一种强类型语言。',
    answer: 'false',
    score: 2,
  },
  {
    type: 'truefalse' as const,
    content: 'HTML5引入了localStorage用于本地存储。',
    answer: 'true',
    score: 2,
  },
  {
    type: 'fill' as const,
    content: 'CSS中用于设置元素外边距的属性是______。',
    answer: 'margin',
    score: 2,
  },
  {
    type: 'fill' as const,
    content: 'JavaScript中声明常量使用的关键字是______。',
    answer: 'const',
    score: 2,
  },
  {
    type: 'essay' as const,
    content: '请简述React中虚拟DOM的工作原理及其优势。',
    answer: '虚拟DOM是React的核心概念...',
    score: 10,
  },
];

const seed = async () => {
  console.log('开始初始化数据库...');
  
  await connectDatabase();
  
  await User.deleteMany({});
  await Question.deleteMany({});
  await Exam.deleteMany({});
  
  const teacher = await User.create({
    name: '张老师',
    email: config.defaultTeacher.email,
    password: config.defaultTeacher.password,
    role: 'teacher',
  });
  
  console.log('创建教师用户:', teacher.email);
  
  const student = await User.create({
    name: '李同学',
    email: config.defaultStudent.email,
    password: config.defaultStudent.password,
    role: 'student',
  });
  
  console.log('创建学生用户:', student.email);
  
  const questions = [];
  let questionIndex = 0;
  
  for (const subject of subjects) {
    const points = knowledgePoints[subject as keyof typeof knowledgePoints];
    
    for (let i = 0; i < 5; i++) {
      const template = sampleQuestions[questionIndex % sampleQuestions.length];
      questionIndex++;
      
      const difficulty = ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as 'easy' | 'medium' | 'hard';
      
      const question = await Question.create({
        type: template.type,
        subject,
        knowledgePoints: [points[Math.floor(Math.random() * points.length)]],
        difficulty,
        score: template.score,
        content: `【${subject}】${template.content}`,
        options: template.options,
        answer: template.answer,
        explanation: `这是${template.type === 'single' ? '单选' : template.type === 'multiple' ? '多选' : template.type === 'truefalse' ? '判断' : template.type === 'fill' ? '填空' : '简答'}题的解析。`,
        createdBy: teacher._id,
      });
      
      questions.push(question);
    }
  }
  
  console.log('创建题目数量:', questions.length);
  
  const now = new Date();
  const exam = await Exam.create({
    title: '前端技术综合测试',
    description: '本测试包含HTML、CSS、JavaScript等前端核心知识点，时间为60分钟。',
    subject: '数据结构',
    totalScore: questions.slice(0, 10).reduce((sum, q) => sum + q.score, 0),
    duration: 60,
    startTime: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: 'published',
    shuffleQuestions: true,
    shuffleOptions: true,
    questions: questions.slice(0, 10).map((q, index) => ({
      questionId: q._id,
      order: index + 1,
      score: q.score,
    })),
    createdBy: teacher._id,
  });
  
  console.log('创建考试:', exam.title);
  
  console.log('数据库初始化完成！');
  console.log('教师账号:', teacher.email, '密码:', config.defaultTeacher.password);
  console.log('学生账号:', student.email, '密码:', config.defaultStudent.password);
  
  process.exit(0);
};

seed().catch((error) => {
  console.error('初始化失败:', error);
  process.exit(1);
});
