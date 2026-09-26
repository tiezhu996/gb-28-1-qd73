import Redis from 'ioredis';
import { config } from './index';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl);
    
    redisClient.on('connect', () => {
      console.log('Redis 连接成功');
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis 错误:', err);
    });
    
    redisClient.on('close', () => {
      console.warn('Redis 连接关闭');
    });
  }
  
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};
