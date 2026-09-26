# 在线考试系统

功能完善的在线考试系统，支持题库管理、智能组卷、在线答题和自动阅卷。

## 项目主要功能

- **题库管理**：支持单选题、多选题、判断题、填空题、简答题等多种题型；支持按学科、知识点、难度分类管理；支持 Excel 批量导入题目
- **智能组卷**：支持手动选题和自动组卷两种模式；自动组卷根据学科、知识点覆盖、难度分布和题量要求智能生成试卷
- **在线考试**：倒计时功能、题目导航栏快速跳转、题目标记、考试结束前5分钟自动提醒、时间到自动提交
- **自动阅卷**：客观题自动评分，主观题支持教师手动批改，自动汇总成绩并生成成绩报告
- **防作弊机制**：浏览器切屏检测并记录次数、随机打乱题目顺序和选项顺序、禁止复制粘贴操作
- **成绩分析**：自动生成成绩分析报告，包含平均分、最高分、最低分、及格率、分数段分布直方图
- **错题回顾**：考试结束后查看答卷与正确答案对照，错题自动加入个人错题本，支持按知识点归类复习

## 快速启动方式

### Docker Compose 一键部署

```bash
docker compose up -d
```

服务启动后，访问前端地址：`http://localhost:8003`

### 初始化数据

首次启动后，需要初始化数据库数据：

```bash
# 进入后端容器
docker exec -it exam-system-backend sh

# 执行种子脚本
npm run seed
```

## 本地开发方式

### 环境要求

- Node.js >= 20
- MongoDB >= 7
- Redis >= 7

### 启动后端

```bash
cd backend

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env

# 启动开发服务器
npm run dev
```

后端服务地址：`http://localhost:3003`

### 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务地址：`http://localhost:3000`

### 初始化数据

```bash
cd backend
npm run seed
```

## 访问地址

| 服务 | 地址 | 备注 |
|------|------|------|
| 前端 | http://localhost:8003 | Docker 部署 |
| 后端 | http://localhost:3003 | API 服务 |
| MongoDB | mongodb://localhost:28017 | 数据库 |
| Redis | redis://localhost:6403 | 缓存服务 |

## 演示账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 教师 | teacher@example.com | teacher123456 |
| 学生 | student@example.com | student123456 |

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js | 14.x |
| 前端样式 | Tailwind CSS | 3.x |
| 前端图表 | Chart.js + react-chartjs-2 | 4.x |
| 状态管理 | Zustand | 4.x |
| HTTP 客户端 | Axios | 1.x |
| 后端框架 | Express | 4.x |
| 后端语言 | TypeScript | 5.x |
| 数据库 | MongoDB | 7.x |
| ODM | Mongoose | 8.x |
| 缓存 | Redis | 7.x |
| 认证 | JWT | 9.x |
| Excel 处理 | xlsx | 0.18.x |
| 容器化 | Docker / Docker Compose | - |
| Web 服务器 | Nginx | - |

## 项目目录结构

```
在线考试系统/
├── backend/                    # 后端项目
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   │   ├── index.ts       # 环境变量配置
│   │   │   ├── database.ts    # 数据库连接
│   │   │   └── redis.ts       # Redis 连接
│   │   ├── controllers/       # 控制器
│   │   │   ├── authController.ts
│   │   │   ├── questionController.ts
│   │   │   ├── examController.ts
│   │   │   ├── examRecordController.ts
│   │   │   └── wrongQuestionController.ts
│   │   ├── middleware/        # 中间件
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── models/            # 数据模型
│   │   │   ├── User.ts
│   │   │   ├── Question.ts
│   │   │   ├── Exam.ts
│   │   │   ├── ExamRecord.ts
│   │   │   └── WrongQuestion.ts
│   │   ├── routes/            # 路由
│   │   │   ├── authRoutes.ts
│   │   │   ├── questionRoutes.ts
│   │   │   ├── examRoutes.ts
│   │   │   ├── examRecordRoutes.ts
│   │   │   ├── wrongQuestionRoutes.ts
│   │   │   └── index.ts
│   │   ├── types/             # 类型定义
│   │   ├── utils/             # 工具函数
│   │   ├── app.ts             # Express 应用
│   │   ├── index.ts           # 入口文件
│   │   └── seed.ts            # 种子数据
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/                   # 前端项目
│   ├── src/
│   │   ├── app/               # 页面路由
│   │   │   ├── login/
│   │   │   ├── questions/
│   │   │   ├── exams/
│   │   │   ├── wrong-questions/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/        # 组件
│   │   │   ├── Layout.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── lib/               # 工具库
│   │   │   └── api.ts         # API 客户端
│   │   ├── store/             # 状态管理
│   │   │   └── authStore.ts
│   │   ├── types/             # 类型定义
│   │   └── utils/             # 工具函数
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── next.config.js
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml          # Docker 编排
├── .env.example               # 环境变量示例
└── README.md
```

## 环境变量说明

### 后端环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 后端服务端口 | 3003 |
| `NODE_ENV` | 运行环境 | development |
| `MONGODB_URI` | MongoDB 连接字符串 | mongodb://localhost:27017/exam_system |
| `REDIS_URL` | Redis 连接地址 | redis://localhost:6379 |
| `JWT_SECRET` | JWT 签名密钥 | - |
| `JWT_EXPIRES_IN` | JWT 过期时间 | 7d |
| `CORS_ORIGIN` | CORS 允许来源 | http://localhost:3000 |
| `UPLOAD_DIR` | 文件上传目录 | ./uploads |
| `DEFAULT_TEACHER_EMAIL` | 默认教师邮箱 | teacher@example.com |
| `DEFAULT_TEACHER_PASSWORD` | 默认教师密码 | teacher123456 |
| `DEFAULT_STUDENT_EMAIL` | 默认学生邮箱 | student@example.com |
| `DEFAULT_STUDENT_PASSWORD` | 默认学生密码 | student123456 |

### 前端环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | API 基础地址 | http://localhost:3003 |

## Docker 部署说明

### 端口映射

| 服务 | 容器端口 | 主机端口 |
|------|----------|----------|
| frontend (Nginx) | 80 | 8003 |
| backend | 3003 | 3003 |
| MongoDB | 27017 | 28017 |
| Redis | 6379 | 6403 |

### 数据卷

| 数据卷名称 | 用途 |
|------------|------|
| exam-system-mongodb-data | MongoDB 数据持久化 |
| exam-system-redis-data | Redis 数据持久化 |
| exam-system-backend-uploads | 后端上传文件 |

### 服务依赖

- backend 依赖 mongodb 和 redis 健康检查通过后启动
- frontend 依赖 backend 启动

### 常用 Docker 命令

```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f [服务名]

# 停止服务
docker compose down

# 停止服务并清除数据
docker compose down -v

# 重新构建镜像并启动
docker compose up -d --build
```

### 常见问题

**Q: 启动后无法访问前端？**

A: 检查前端容器是否正常运行：`docker compose ps`，查看日志：`docker compose logs frontend`

**Q: 后端无法连接数据库？**

A: 检查 MongoDB 容器是否健康：`docker inspect exam-system-mongodb | grep -A 5 Health`

**Q: 登录时提示 401 未授权？**

A: 确认已执行种子脚本初始化数据：`docker exec -it exam-system-backend npm run seed`

**Q: 前端无法调用后端 API？**

A: 检查 Nginx 反向代理配置是否正确，确保请求 `/api/*` 路径被正确转发到 backend 服务

## License

MIT License
