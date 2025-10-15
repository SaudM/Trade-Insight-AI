# 数据库迁移和测试脚本

本目录包含了用于数据库迁移、种子数据创建和API测试的脚本。

## 脚本说明

### 1. migrate-db.ts - 数据库迁移脚本

创建数据库表结构、枚举类型和索引。

**功能：**
- 创建所有必需的枚举类型
- 创建用户、订单、订阅、交易日志等表
- 创建优化查询性能的索引
- 验证表结构

**使用方法：**
```bash
npm run db:migrate
```

### 2. seed-db.ts - 种子数据脚本

创建测试数据或清理数据库。

**功能：**
- 创建测试用户
- 创建测试订单
- 创建测试订阅
- 创建测试交易日志
- 清理所有数据

**使用方法：**
```bash
# 创建种子数据
npm run db:seed

# 清理所有数据
npm run db:clean

# 重置数据库（清理 + 迁移 + 种子数据）
npm run db:reset
```

### 3. test-apis.ts - API测试脚本

测试API功能和数据一致性。

**功能：**
- 测试数据库连接
- 验证表结构
- 测试PostgreSQL适配器
- 测试订阅相关API
- 检查数据一致性

**使用方法：**
```bash
npm run test:apis
```

### 4. init-db.sql - 数据库初始化脚本

Docker容器启动时自动执行的SQL脚本。

## 环境配置

在运行脚本之前，请确保：

1. **环境变量配置**
   复制 `.env.example` 为 `.env.local` 并配置相应的环境变量：
   ```bash
   cp .env.example .env.local
   ```

2. **数据库连接**
   确保 `DATABASE_URL` 环境变量正确配置：
   ```
   DATABASE_URL="postgresql://trade_user:trade_password_2024@localhost:5432/trade_insight_ai"
   ```

3. **依赖安装**
   确保所有依赖已安装：
   ```bash
   npm install
   ```

## 使用流程

### 开发环境设置

1. **启动数据库**
   ```bash
   docker-compose up postgres -d
   ```

2. **运行迁移**
   ```bash
   npm run db:migrate
   ```

3. **创建测试数据**
   ```bash
   npm run db:seed
   ```

4. **测试API功能**
   ```bash
   npm run test:apis
   ```

### 生产环境部署

1. **完整部署**
   ```bash
   docker-compose up -d
   ```

2. **验证部署**
   ```bash
   npm run test:apis
   ```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `DATABASE_URL` 环境变量
   - 确保PostgreSQL服务正在运行
   - 验证数据库用户权限

2. **表已存在错误**
   - 脚本使用 `IF NOT EXISTS` 语句，应该不会出现此错误
   - 如果出现，可以先清理数据库再重新迁移

3. **API测试失败**
   - 确保应用服务正在运行
   - 检查API端点是否正确
   - 验证环境变量配置

### 重置数据库

如果需要完全重置数据库：

```bash
# 方法1：使用脚本
npm run db:reset

# 方法2：手动操作
npm run db:clean
npm run db:migrate
npm run db:seed
```

## 注意事项

1. **生产环境**
   - 在生产环境中谨慎使用清理脚本
   - 建议在执行迁移前备份数据
   - 测试脚本可能会创建测试数据

2. **权限要求**
   - 数据库用户需要创建表、索引的权限
   - 需要读写数据的权限

3. **性能考虑**
   - 大量数据时，索引创建可能需要较长时间
   - 建议在低峰期执行迁移操作