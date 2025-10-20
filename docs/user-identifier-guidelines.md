# 用户标识符使用规范

## 概述

本系统使用两种主要的用户标识符：
- **系统UID（UUID）**：用于业务逻辑和数据操作
- **Firebase UID**：仅用于Google登录认证

## 标识符类型

### 1. 系统UID（推荐）
- **格式**：UUID v4 格式（例如：`123e4567-e89b-12d3-a456-426614174000`）
- **用途**：所有业务逻辑操作
- **优势**：
  - 直接对应数据库主键
  - 性能更好（无需额外查询）
  - 与认证系统解耦

### 2. Firebase UID
- **格式**：Firebase生成的字符串（例如：`abc123def456ghi789`）
- **用途**：仅用于Google登录认证和初始用户查询
- **限制**：需要额外查询获取系统UID

## API参数规范

### 参数优先级
所有API端点按以下优先级接受用户标识符：
1. `uid` - 系统UID（最高优先级，推荐使用）
2. `firebaseUid` - Firebase UID（兼容性支持）
3. `userId` - 已废弃（仅为向后兼容保留）

### 示例
```javascript
// 推荐：使用系统UID
GET /api/user?uid=123e4567-e89b-12d3-a456-426614174000

// 兼容：使用Firebase UID
GET /api/user?firebaseUid=abc123def456ghi789

// 废弃：使用旧参数（不推荐）
GET /api/user?userId=abc123def456ghi789
```

## 已更新的API端点

### 1. 用户信息API
- **端点**：`/api/user`
- **方法**：GET
- **参数**：`uid` | `firebaseUid` | `userId`

### 2. 订单API
- **端点**：`/api/orders`
- **方法**：GET
- **参数**：`uid` | `firebaseUid` | `userId`

### 3. 订阅记录API
- **端点**：`/api/subscription/records`
- **方法**：GET
- **参数**：`uid` | `firebaseUid` | `userId`

### 4. 每日分析API
- **端点**：`/api/daily-analyses`
- **方法**：GET
- **参数**：`uid` | `firebaseUid` | `userId`

### 5. 周报API
- **端点**：`/api/weekly-reviews`
- **方法**：GET
- **参数**：`uid` | `firebaseUid` | `userId`

### 6. 月报API
- **端点**：`/api/monthly-summaries`
- **方法**：GET
- **参数**：`uid` | `firebaseUid` | `userId`

### 7. 订阅激活API
- **端点**：`/api/subscription/activate`
- **方法**：POST
- **参数**：`uid` | `firebaseUid` | `userId`

## UserAdapter方法

### 认证相关方法（使用Firebase UID）
```typescript
// 仅用于Google登录认证
UserAdapter.getUserByFirebaseUid(firebaseUid: string)
UserAdapter.getUserWithSubscription(firebaseUid: string)
```

### 业务逻辑方法（使用系统UID）
```typescript
// 推荐用于所有业务逻辑
UserAdapter.getUserByUid(uid: string)
UserAdapter.getUserWithSubscriptionByUid(uid: string)
```

## 最佳实践

### 1. 前端开发
- 在用户登录后，立即获取并缓存系统UID
- 所有业务API调用使用系统UID
- 仅在认证流程中使用Firebase UID

### 2. 后端开发
- 新API优先支持系统UID
- 保持Firebase UID兼容性
- 在API文档中明确标识符类型

### 3. 数据库操作
- 直接使用系统UID进行查询
- 避免通过Firebase UID进行复杂关联查询

## 迁移指南

### 现有代码迁移
1. 识别使用Firebase UID的业务逻辑代码
2. 修改为使用系统UID
3. 保留Firebase UID作为兼容性参数
4. 更新API文档和前端调用

### 测试验证
- 使用系统UID测试所有API端点
- 验证Firebase UID兼容性
- 确保性能提升

## 注意事项

1. **向后兼容**：所有API保持对Firebase UID的支持
2. **性能优化**：优先使用系统UID以减少数据库查询
3. **安全性**：系统UID不应暴露给未授权用户
4. **文档更新**：及时更新API文档反映参数变更

## 相关文件

- `src/lib/adapters/user-adapter.ts` - 用户适配器
- `src/app/api/*/route.ts` - 各API端点实现
- `docs/api-documentation.md` - API文档