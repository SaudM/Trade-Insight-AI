# 生产环境部署配置指南

本文档说明如何在生产环境中正确配置Trade Insight AI项目，特别是关于测试数据和预设数据的处理。

## 🔧 环境变量配置

### 核心环境变量

在生产环境中，请确保设置以下环境变量：

```bash
# 数据库配置
DATABASE_URL="postgresql://username:password@host:port/database"

# 禁用预设数据创建（生产环境必须设置）
ENABLE_PRESET_DATA=false

# 环境标识
NODE_ENV=production

# Redis配置（如果使用缓存）
REDIS_URL="redis://host:port"

# Firebase配置
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email"
```

### 预设数据控制

#### `ENABLE_PRESET_DATA` 环境变量

- **默认值**: `true`（开发环境）
- **生产环境设置**: `false`
- **作用**: 控制是否为新注册用户自动创建示例数据

当 `ENABLE_PRESET_DATA=false` 时：
- 新用户注册后不会自动创建示例交易笔记
- 新用户注册后不会自动创建示例日分析报告
- 用户将看到空白的数据面板，需要自己添加真实数据

## 📊 测试数据初始化脚本

项目包含以下数据初始化相关的脚本：

### 1. 预设数据服务 (`src/lib/services/preset-data-service.ts`)

**功能**：
- 为新用户创建示例交易笔记（AAPL股票交易示例）
- 为新用户创建示例日分析报告
- 展示系统功能和数据结构

**生产环境处理**：
- 通过 `ENABLE_PRESET_DATA=false` 环境变量禁用
- 在 `UserAdapter.createUser()` 方法中控制调用

### 2. 数据库种子脚本 (`scripts/seed-db.ts`)

**功能**：
- 创建测试用户账户
- 创建测试订单和订阅数据
- 创建测试交易日志

**使用场景**：
- 仅用于开发和测试环境
- 生产环境不应运行此脚本

**相关命令**：
```bash
# 创建种子数据（仅开发环境）
npm run db:seed

# 清理所有数据（仅开发环境）
npm run db:clean

# 重置数据库（仅开发环境）
npm run db:reset
```

### 3. 数据库初始化脚本 (`scripts/init-db.sql`)

**功能**：
- 创建数据库表结构
- 创建索引和约束
- 包含少量示例数据（测试用户）

**生产环境处理**：
- 可以运行表结构创建部分
- 需要移除或注释掉示例数据插入部分

## 🚀 部署步骤

### 1. 环境变量设置

在你的部署平台（如Vercel、Railway、Docker等）中设置：

```bash
ENABLE_PRESET_DATA=false
NODE_ENV=production
DATABASE_URL=your_production_database_url
```

### 2. 数据库初始化

**选项A：使用Prisma迁移（推荐）**
```bash
npx prisma migrate deploy
npx prisma generate
```

**选项B：手动执行SQL**
```bash
# 仅执行表结构创建部分，跳过示例数据
psql $DATABASE_URL -f scripts/init-db.sql
```

### 3. 验证配置

部署后验证以下内容：

1. **新用户注册测试**：
   - 注册新用户
   - 确认用户数据面板为空（无示例数据）
   - 确认用户可以正常添加真实数据

2. **日志检查**：
   - 查看应用日志
   - 确认没有"创建预设数据"相关的日志信息

## 🔍 故障排除

### 问题：新用户仍然看到示例数据

**解决方案**：
1. 检查 `ENABLE_PRESET_DATA` 环境变量是否正确设置为 `false`
2. 重启应用服务
3. 清理可能存在的缓存

### 问题：数据库中存在测试用户

**解决方案**：
```sql
-- 删除测试用户（谨慎操作）
DELETE FROM users WHERE email IN ('test@example.com', 'demo@example.com');
```

### 问题：应用启动时出现数据库错误

**解决方案**：
1. 检查 `DATABASE_URL` 是否正确
2. 确认数据库表结构已正确创建
3. 运行 `npx prisma migrate deploy` 同步表结构

## 📝 开发环境恢复

如果需要在开发环境中重新启用预设数据：

```bash
# 设置环境变量
ENABLE_PRESET_DATA=true

# 或者删除该环境变量（默认启用）
unset ENABLE_PRESET_DATA
```

## 🔒 安全注意事项

1. **生产数据库**：
   - 绝不在生产数据库中运行种子脚本
   - 定期备份生产数据
   - 使用强密码和SSL连接

2. **环境变量**：
   - 不要在代码中硬编码敏感信息
   - 使用安全的环境变量管理服务
   - 定期轮换数据库密码和API密钥

3. **访问控制**：
   - 限制数据库访问权限
   - 使用防火墙保护数据库端口
   - 启用数据库审计日志

---

**重要提醒**：在生产环境部署前，请务必在测试环境中验证所有配置，确保应用功能正常且无测试数据泄露。