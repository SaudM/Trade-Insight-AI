# Redis缓存基类使用指南

## 概述

`CachedApiHandler` 是一个通用的Redis缓存基类，提供标准化的缓存读取、写入和清除功能。所有需要Redis缓存的GET接口都可以使用此基类来简化缓存逻辑实现。

## 核心特性

- **自动缓存管理**: 自动处理缓存读取、写入和过期
- **错误处理**: 内置Redis连接错误处理，确保API稳定性
- **数据库回退**: Redis不可用时自动回退到数据库
- **异步缓存操作**: 缓存写入和清除不阻塞API响应
- **类型安全**: 完整的TypeScript类型支持
- **灵活配置**: 支持自定义缓存键、TTL和启用状态

## 基本使用方法

### 1. 导入必要的模块

```typescript
import { NextRequest } from 'next/server';
import { CachedApiHandler } from '@/lib/cached-api-handler';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { YourDataAdapter } from '@/lib/adapters/your-adapter';
```

### 2. 实现带缓存的GET接口

```typescript
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), { 
        status: 400 
      });
    }

    // 定义数据获取函数
    const fetchUserData = async (userId: string) => {
      return await YourDataAdapter.getUserData(userId);
    };

    // 配置缓存选项
    const cacheOptions = CachedApiHandler.createCacheOptions(
      CacheKeys.userData,           // 缓存键生成函数
      CacheConfig.USER_DATA_TTL,    // TTL (可选，默认使用USER_DATA_TTL)
      true                          // 启用缓存 (可选，默认为true)
    );

    // 使用缓存基类处理请求
    return await CachedApiHandler.handleCachedGet(
      req,
      fetchUserData,
      cacheOptions,
      userId  // 传递给数据获取函数的参数
    );

  } catch (err: any) {
    console.error('API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}
```

### 3. 实现POST接口的缓存清除

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ...otherData } = body;

    // 验证必填字段
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400 
      });
    }

    // 执行数据创建/更新操作
    const result = await YourDataAdapter.createData({
      userId,
      ...otherData
    });

    // 清除相关缓存（异步操作，不阻塞响应）
    const cacheKey = CacheKeys.userData(userId);
    CachedApiHandler.clearCacheAsync(cacheKey);

    return Response.json(result);

  } catch (err: any) {
    console.error('POST API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}
```

## 高级用法

### 1. 批量缓存清除

```typescript
// 清除多个相关缓存
const cacheKeys = [
  CacheKeys.userData(userId),
  CacheKeys.userAnalyses(userId),
  CacheKeys.userSettings(userId)
];

CachedApiHandler.clearMultipleCacheAsync(cacheKeys);
```

### 2. 检查缓存状态

```typescript
// 检查缓存是否存在
const exists = await CachedApiHandler.cacheExists(cacheKey);

// 获取缓存剩余时间
const ttl = await CachedApiHandler.getCacheTTL(cacheKey);
```

### 3. 自定义缓存配置

```typescript
// 创建自定义缓存配置
const customCacheOptions = CachedApiHandler.createCacheOptions(
  (userId: string, type: string) => \`user:\${userId}:\${type}\`,  // 自定义键生成器
  3600,  // 1小时TTL
  process.env.NODE_ENV === 'production'  // 仅在生产环境启用缓存
);
```

### 4. 禁用缓存

```typescript
// 临时禁用缓存（直接从数据库获取）
const cacheOptions = CachedApiHandler.createCacheOptions(
  CacheKeys.userData,
  CacheConfig.USER_DATA_TTL,
  false  // 禁用缓存
);
```

## API响应格式

使用缓存基类的API会在响应中自动添加以下字段：

```typescript
{
  // 原始数据...
  "_cached": boolean,     // 是否来自缓存
  "_cacheTime": string    // 缓存时间戳 (ISO格式)
}
```

## 缓存键命名规范

建议在 `CacheKeys` 中定义标准化的缓存键生成函数：

```typescript
// src/lib/redis.ts
export const CacheKeys = {
  userData: (userId: string) => \`user:\${userId}:data\`,
  userAnalyses: (userId: string) => \`user:\${userId}:analyses\`,
  userSettings: (userId: string) => \`user:\${userId}:settings\`,
  // 添加更多缓存键...
};
```

## 错误处理

缓存基类内置了完善的错误处理机制：

1. **Redis连接失败**: 自动回退到数据库，不影响API功能
2. **数据库连接失败**: 返回503状态码和相应错误信息
3. **数据获取失败**: 返回500状态码和详细错误信息
4. **缓存操作失败**: 记录警告日志，不影响主要功能

## 性能优化建议

1. **合理设置TTL**: 根据数据更新频率设置合适的过期时间
2. **异步缓存操作**: 使用 `clearCacheAsync` 避免阻塞响应
3. **批量操作**: 使用 `clearMultipleCacheAsync` 提高效率
4. **监控缓存命中率**: 通过日志监控缓存效果

## 实际案例

参考 `src/app/api/daily-analyses/route.ts` 文件，查看完整的实现示例。

## 注意事项

1. 确保Redis服务正常运行
2. 合理配置缓存过期时间，避免数据过期
3. 在数据更新操作后及时清除相关缓存
4. 监控Redis内存使用情况
5. 在开发环境中可以禁用缓存以便调试

## 扩展性

该基类设计为可扩展的，你可以：

1. 继承 `CachedApiHandler` 创建特定业务的缓存处理器
2. 添加自定义缓存策略（如LRU、LFU等）
3. 集成缓存预热机制
4. 添加缓存统计和监控功能