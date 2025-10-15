/**
 * PostgreSQL数据库连接配置
 * 使用Prisma ORM进行数据库操作
 */

import { PrismaClient } from '@prisma/client'

// 全局声明，避免在开发环境中重复创建连接
declare global {
  var prisma: PrismaClient | undefined
}

/**
 * 创建Prisma客户端实例
 * 在开发环境中复用连接，在生产环境中创建新连接
 */
const prisma = globalThis.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// 在开发环境中将客户端实例保存到全局变量
if (process.env.NODE_ENV === 'development') {
  globalThis.prisma = prisma
}

export { prisma }

/**
 * 数据库连接健康检查
 * @returns Promise<boolean> 连接是否正常
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('数据库连接失败:', error)
    return false
  }
}

/**
 * 优雅关闭数据库连接
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('关闭数据库连接时出错:', error)
  }
}