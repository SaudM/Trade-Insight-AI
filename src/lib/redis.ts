/**
 * Redis客户端配置和连接管理模块
 * 提供Redis连接、缓存操作和错误处理功能
 */

import { createClient, RedisClientType } from 'redis';

/**
 * Redis缓存配置接口
 */
interface CacheConfig {
  /** 缓存过期时间（秒） */
  ttl: number;
  /** 缓存键前缀 */
  keyPrefix: string;
}

/**
 * Redis客户端类
 * 管理Redis连接和缓存操作
 */
class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  /**
   * 默认缓存配置
   */
  private readonly defaultConfig: CacheConfig = {
    ttl: 300, // 5分钟
    keyPrefix: 'trade-insight:'
  };

  /**
   * 获取Redis连接配置
   */
  private getRedisConfig() {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };
  }

  /**
   * 初始化Redis客户端
   */
  private async initClient(): Promise<void> {
    if (this.client && this.isConnected) {
      return;
    }

    try {
      const config = this.getRedisConfig();
      
      this.client = createClient({
        socket: {
          host: config.host,
          port: config.port,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis连接重试次数超限，停止重连');
              return false;
            }
            return Math.min(retries * 50, 500);
          }
        },
        password: config.password,
        database: config.db,
      });

      // 监听连接事件
      this.client.on('connect', () => {
        console.log('Redis客户端连接成功');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('Redis连接错误:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('Redis连接已断开');
        this.isConnected = false;
      });

      await this.client.connect();
      
    } catch (error) {
      console.error('Redis客户端初始化失败:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * 确保Redis连接可用
   */
  private async ensureConnection(): Promise<boolean> {
    if (this.isConnected && this.client) {
      return true;
    }

    if (this.connectionPromise) {
      try {
        await this.connectionPromise;
        return this.isConnected;
      } catch {
        return false;
      }
    }

    this.connectionPromise = this.initClient();
    
    try {
      await this.connectionPromise;
      return this.isConnected;
    } catch {
      return false;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.defaultConfig.keyPrefix;
    return `${keyPrefix}${key}`;
  }

  /**
   * 获取缓存数据
   */
  async get<T = any>(key: string, prefix?: string): Promise<T | null> {
    try {
      const isConnected = await this.ensureConnection();
      if (!isConnected || !this.client) {
        console.warn('Redis连接不可用，跳过缓存读取');
        return null;
      }

      const cacheKey = this.generateKey(key, prefix);
      const value = await this.client.get(cacheKey);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
      
    } catch (error) {
      console.error('Redis获取缓存失败:', error);
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  async set(
    key: string, 
    value: any, 
    ttl?: number, 
    prefix?: string
  ): Promise<boolean> {
    try {
      const isConnected = await this.ensureConnection();
      if (!isConnected || !this.client) {
        console.warn('Redis连接不可用，跳过缓存写入');
        return false;
      }

      const cacheKey = this.generateKey(key, prefix);
      const serializedValue = JSON.stringify(value);
      const cacheTtl = ttl || this.defaultConfig.ttl;

      await this.client.setEx(cacheKey, cacheTtl, serializedValue);
      return true;
      
    } catch (error) {
      console.error('Redis设置缓存失败:', error);
      return false;
    }
  }

  /**
   * 删除缓存数据
   */
  async del(key: string, prefix?: string): Promise<boolean> {
    try {
      const isConnected = await this.ensureConnection();
      if (!isConnected || !this.client) {
        console.warn('Redis连接不可用，跳过缓存删除');
        return false;
      }

      const cacheKey = this.generateKey(key, prefix);
      await this.client.del(cacheKey);
      return true;
      
    } catch (error) {
      console.error('Redis删除缓存失败:', error);
      return false;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    try {
      const isConnected = await this.ensureConnection();
      if (!isConnected || !this.client) {
        return false;
      }

      const cacheKey = this.generateKey(key, prefix);
      const result = await this.client.exists(cacheKey);
      return result === 1;
      
    } catch (error) {
      console.error('Redis检查缓存存在性失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存剩余过期时间
   */
  async ttl(key: string, prefix?: string): Promise<number> {
    try {
      const isConnected = await this.ensureConnection();
      if (!isConnected || !this.client) {
        return -1;
      }

      const cacheKey = this.generateKey(key, prefix);
      return await this.client.ttl(cacheKey);
      
    } catch (error) {
      console.error('Redis获取TTL失败:', error);
      return -1;
    }
  }

  /**
   * 关闭Redis连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
      }
    } catch (error) {
      console.error('Redis断开连接失败:', error);
    }
  }

  /**
   * 检查Redis连接状态
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }
}

// 创建全局Redis客户端实例
const redisClient = new RedisClient();

/**
 * 缓存工具函数
 */
export const cache = {
  /**
   * 获取缓存
   */
  get: <T = any>(key: string, prefix?: string) => redisClient.get<T>(key, prefix),
  
  /**
   * 设置缓存
   */
  set: (key: string, value: any, ttl?: number, prefix?: string) => 
    redisClient.set(key, value, ttl, prefix),
  
  /**
   * 删除缓存
   */
  del: (key: string, prefix?: string) => redisClient.del(key, prefix),
  
  /**
   * 检查缓存是否存在
   */
  exists: (key: string, prefix?: string) => redisClient.exists(key, prefix),
  
  /**
   * 获取缓存剩余时间
   */
  ttl: (key: string, prefix?: string) => redisClient.ttl(key, prefix),
  
  /**
   * 检查连接状态
   */
  isConnected: () => redisClient.isRedisConnected(),
};

/**
 * 缓存键生成器
 */
export const CacheKeys = {
  /**
   * 用户日分析缓存键
   */
  userDailyAnalyses: (userId: string) => `daily-analyses:user:${userId}`,
  
  /**
   * 用户周分析缓存键
   */
  userWeeklyAnalyses: (userId: string) => `weekly-analyses:user:${userId}`,
  
  /**
   * 用户月分析缓存键
   */
  userMonthlySummaries: (userId: string) => `monthly-summaries:user:${userId}`,
  
  /**
   * 用户交易日志缓存键
   */
  userTradeLogs: (userId: string) => `trade-logs:user:${userId}`,
  
  /**
   * 用户信息缓存键
   */
  userInfo: (firebaseUid: string) => `user:info:${firebaseUid}`,
};

/**
 * 缓存配置常量
 */
export const CacheConfig = {
  /** 短期缓存 - 5分钟 */
  SHORT_TTL: 300,
  
  /** 中期缓存 - 30分钟 */
  MEDIUM_TTL: 1800,
  
  /** 长期缓存 - 2小时 */
  LONG_TTL: 7200,
  
  /** 用户数据缓存 - 1小时 */
  USER_DATA_TTL: 3600,
};

export default redisClient;