/**
 * 清除Redis缓存脚本
 */

const { createClient } = require('redis');

async function clearCache() {
  const redis = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB || '0'),
  });
  
  await redis.connect();
  
  try {
    console.log('🧹 清除Redis缓存...\n');
    
    // 获取所有缓存键
    const keys = await redis.keys('*');
    console.log(`📋 找到 ${keys.length} 个缓存键:`);
    keys.forEach(key => console.log(`  - ${key}`));
    
    if (keys.length > 0) {
      // 清除所有缓存
      await redis.del(...keys);
      console.log(`\n✅ 已清除 ${keys.length} 个缓存键`);
    } else {
      console.log('\n📭 没有找到缓存键');
    }
    
  } catch (error) {
    console.error('❌ 清除缓存失败:', error);
  } finally {
    await redis.quit();
  }
}

clearCache();