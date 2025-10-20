/**
 * 通用Redis缓存API处理基类
 * 提供标准化的缓存读取、写入和清除功能
 * 所有需要Redis缓存的GET接口都可以继承此基类
 */

import { NextRequest, NextResponse } from 'next/server';
import { cache, CacheKeys, CacheConfig } from '@/lib/redis';
import { checkDatabaseConnection } from '@/lib/db';

/**
 * 缓存配置接口
 */
export interface CacheOptions {
  /** 缓存键生成函数 */
  keyGenerator: (...args: any[]) => string;
  /** 缓存过期时间（秒），默认使用 CacheConfig.USER_DATA_TTL */
  ttl?: number;
  /** 是否启用缓存，默认为 true */
  enabled?: boolean;
}

/**
 * API响应数据接口
 */
export interface ApiResponse<T = any> {
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 数据源标识 */
  source?: string;
  /** 是否来自缓存 */
  _cached?: boolean;
  /** 缓存时间戳 */
  _cacheTime?: string;
}

/**
 * 数据获取函数类型
 */
export type DataFetcher<T> = (...args: any[]) => Promise<T>;

/**
 * 通用Redis缓存API处理基类
 */
export abstract class CachedApiHandler {
  
  /**
   * 带缓存的GET请求处理
   * @param req NextRequest对象
   * @param dataFetcher 数据获取函数
   * @param cacheOptions 缓存配置选项
   * @param fetcherArgs 传递给数据获取函数的参数
   * @returns Promise<NextResponse>
   */
  public static async handleCachedGet<T>(
    req: NextRequest,
    dataFetcher: DataFetcher<T>,
    cacheOptions: CacheOptions,
    ...fetcherArgs: any[]
  ): Promise<NextResponse> {
    try {
      // 检查缓存是否启用
      if (!cacheOptions.enabled) {
        return this.handleDirectFetch(dataFetcher, ...fetcherArgs);
      }

      // 生成缓存键
      const cacheKey = cacheOptions.keyGenerator(...fetcherArgs);
      
      try {
        // 1. 首先尝试从Redis缓存中获取数据
        const cachedData = await cache.get(cacheKey);
        
        if (cachedData !== null) {
          console.log(`从Redis缓存获取数据，缓存键: ${cacheKey}`);
          // 如果缓存数据是数组，直接返回数组，否则展开对象
          const responseData = Array.isArray(cachedData) ? cachedData : { ...cachedData };
          
          return NextResponse.json({
            data: responseData,
            _cached: true,
            _cacheTime: new Date().toISOString()
          });
        }

        console.log(`Redis缓存未命中，从数据库获取数据，缓存键: ${cacheKey}`);

      } catch (cacheError) {
        console.warn('Redis缓存读取失败，继续从数据库获取:', cacheError);
      }

      // 2. 缓存未命中或Redis不可用，从数据库获取数据
      return this.handleDatabaseFetch(dataFetcher, cacheKey, cacheOptions.ttl, ...fetcherArgs);

    } catch (err: any) {
      console.error('CachedApiHandler处理错误:', err);
      return NextResponse.json(
        { error: err.message || 'Internal error' },
        { status: 500 }
      );
    }
  }

  /**
   * 直接获取数据（不使用缓存）
   */
  private static async handleDirectFetch<T>(
    dataFetcher: DataFetcher<T>,
    ...fetcherArgs: any[]
  ): Promise<NextResponse> {
    try {
      // 检查数据库连接
      const isDbConnected = await checkDatabaseConnection();
      
      if (!isDbConnected) {
        console.warn('数据库连接失败');
        return NextResponse.json(
          { 
            error: 'Database connection failed',
            source: 'postgres_failed'
          },
          { status: 503 }
        );
      }

      const data = await dataFetcher(...fetcherArgs);
      
      // 如果数据是数组，直接返回数组，否则展开对象
      const responseData = Array.isArray(data) ? data : { ...data };
      
      return NextResponse.json({
        data: responseData,
        _cached: false,
        _cacheTime: new Date().toISOString()
      });

    } catch (error) {
      console.error('直接数据获取失败:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch data',
          source: 'postgres'
        },
        { status: 500 }
      );
    }
  }

  /**
   * 从数据库获取数据并缓存
   */
  private static async handleDatabaseFetch<T>(
    dataFetcher: DataFetcher<T>,
    cacheKey: string,
    ttl: number = CacheConfig.USER_DATA_TTL,
    ...fetcherArgs: any[]
  ): Promise<NextResponse> {
    try {
      // 检查数据库连接
      const isDbConnected = await checkDatabaseConnection();
      
      if (!isDbConnected) {
        console.warn('数据库连接失败');
        return NextResponse.json(
          { 
            error: 'Database connection failed',
            source: 'postgres_failed'
          },
          { status: 503 }
        );
      }

      // 从数据库获取数据
      const data = await dataFetcher(...fetcherArgs);

      // 异步将数据存入Redis缓存（不阻塞响应）
      this.setCacheAsync(cacheKey, data, ttl);

      return NextResponse.json({
        data: data,
        _cached: false,
        _cacheTime: new Date().toISOString()
      });

    } catch (error) {
      console.error('数据库数据获取失败:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch data from database',
          source: 'postgres'
        },
        { status: 500 }
      );
    }
  }

  /**
   * 异步设置缓存
   */
  private static setCacheAsync<T>(cacheKey: string, data: T, ttl: number): void {
    cache.set(cacheKey, data, ttl)
      .then((success) => {
        if (success) {
          console.log(`成功缓存数据到Redis，缓存键: ${cacheKey}`);
        } else {
          console.warn(`缓存数据到Redis失败，缓存键: ${cacheKey}`);
        }
      })
      .catch((error) => {
        console.error('Redis缓存写入异常:', error);
      });
  }

  /**
   * 清除指定缓存
   * @param cacheKey 缓存键
   * @returns Promise<boolean> 是否成功清除
   */
  public static async clearCache(cacheKey: string): Promise<boolean> {
    try {
      const success = await cache.del(cacheKey);
      if (success) {
        console.log(`成功清除缓存，缓存键: ${cacheKey}`);
      } else {
        console.warn(`清除缓存失败，缓存键: ${cacheKey}`);
      }
      return success;
    } catch (error) {
      console.error('Redis缓存清除异常:', error);
      return false;
    }
  }

  /**
   * 异步清除缓存（不阻塞响应）
   * @param cacheKey 缓存键
   */
  public static clearCacheAsync(cacheKey: string): void {
    this.clearCache(cacheKey)
      .then((success) => {
        if (success) {
          console.log(`异步清除缓存成功，缓存键: ${cacheKey}`);
        } else {
          console.warn(`异步清除缓存失败，缓存键: ${cacheKey}`);
        }
      })
      .catch((error) => {
        console.error('异步清除缓存异常:', error);
      });
  }

  /**
   * 批量清除缓存
   * @param cacheKeys 缓存键数组
   * @returns Promise<boolean[]> 每个缓存键的清除结果
   */
  protected static async clearMultipleCache(cacheKeys: string[]): Promise<boolean[]> {
    const results = await Promise.allSettled(
      cacheKeys.map(key => this.clearCache(key))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`清除缓存失败，缓存键: ${cacheKeys[index]}`, result.reason);
        return false;
      }
    });
  }

  /**
   * 异步批量清除缓存（不阻塞响应）
   * @param cacheKeys 缓存键数组
   */
  protected static clearMultipleCacheAsync(cacheKeys: string[]): void {
    this.clearMultipleCache(cacheKeys)
      .then((results) => {
        const successCount = results.filter(Boolean).length;
        console.log(`批量清除缓存完成，成功: ${successCount}/${results.length}`);
      })
      .catch((error) => {
        console.error('批量清除缓存异常:', error);
      });
  }

  /**
   * 检查缓存是否存在
   * @param cacheKey 缓存键
   * @returns Promise<boolean> 缓存是否存在
   */
  protected static async cacheExists(cacheKey: string): Promise<boolean> {
    try {
      return await cache.exists(cacheKey);
    } catch (error) {
      console.error('检查缓存存在性失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存剩余过期时间
   * @param cacheKey 缓存键
   * @returns Promise<number> 剩余秒数，-1表示永不过期，-2表示键不存在
   */
  protected static async getCacheTTL(cacheKey: string): Promise<number> {
    try {
      return await cache.ttl(cacheKey);
    } catch (error) {
      console.error('获取缓存TTL失败:', error);
      return -2;
    }
  }

  /**
   * 创建标准的缓存配置
   * @param keyGenerator 缓存键生成函数
   * @param ttl 过期时间（秒）
   * @param enabled 是否启用缓存
   * @returns CacheOptions
   */
  public static createCacheOptions(
    keyGenerator: (...args: any[]) => string,
    ttl: number = CacheConfig.USER_DATA_TTL,
    enabled: boolean = true
  ): CacheOptions {
    return {
      keyGenerator,
      ttl,
      enabled
    };
  }
}