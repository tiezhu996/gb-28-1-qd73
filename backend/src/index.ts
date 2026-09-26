import app from './app';
import { config } from './config';
import { connectDatabase } from './config/database';
import { getRedisClient } from './config/redis';

const startServer = async () => {
  try {
    await connectDatabase();
    getRedisClient();
    
    app.listen(config.port, () => {
      console.log(`服务器运行在端口 ${config.port}`);
      console.log(`环境: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('收到 SIGINT 信号，关闭服务器...');
  process.exit(0);
});

startServer();
