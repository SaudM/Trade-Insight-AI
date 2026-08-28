
# 交易笔记AI (Trade Insight AI)

**English** | [**简体中文**](./README.zh-CN.md)

---

**交易笔记AI** 是一款专为交易者设计的现代化、由AI驱动的交易日志分析工具。它旨在帮助您记录、分析并从每一笔交易中学习，通过深度数据洞察和智能建议，最终提升您的交易表现。

[![交易笔记AI 仪表盘](./docs/1.png)](https://studio--studio-4954880629-a3af8.us-central1.hosted.app/)

## ✨ 核心功能

- **📝 现代化交易日志**: 快速、便捷地记录您的每一笔交易，包括入场/出场理由、仓位大小、盈亏、交易心态等关键信息。
- **📊 可视化仪表盘**: 通过直观的图表和关键绩效指标（KPIs）全面了解您的交易表现，包括累计盈亏曲线、胜率、盈亏比、平均盈利/亏损等。
- **🤖 AI驱动的深度分析**:
    - **每日分析**: AI每日总结您的交易活动，识别优点与不足，并分析情绪对决策的影响。
    - **每周回顾**: 发现您交易行为中的成功模式和常见错误，并评估仓位管理的有效性。
    - **月度总结**: 对比今、昨两月的表现，识别长期存在的问题，并提供系统性的迭代建议。
- **💳 订阅管理**: 集成微信支付的多层级订阅服务（月度/季度/半年/年度）
- **🔐 数据私有化与安全**: 支持Firebase和PostgreSQL双重存储方案，确保您的交易隐私和数据所有权。
- **🎨 现代、美观且响应式**: 采用 `shadcn/ui` 和 `Tailwind CSS` 构建，支持明暗主题切换，确保在桌面和移动设备上都有一流的用户体验。

| 交易日志 | AI分析报告 |
| :---: | :---: |
| ![交易日志](./docs/2.png) | ![AI分析报告](./docs/3.png) |

## 🏗️ 系统架构

### 整体架构设计

系统采用现代化的全栈架构，基于微服务理念设计，主要包含以下层次：

```
┌─────────────────────────────────────────────────────────────┐
│                    前端层 (Frontend Layer)                    │
│  Next.js 15.3.3 + React 18.3.1 + TypeScript + Tailwind CSS │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                     API层 (API Layer)                       │
│        Next.js API Routes + Firebase Auth + 微信支付        │
└─────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│   数据存储层     │ │  AI处理层   │ │    缓存层       │
│  PostgreSQL +   │ │ Google      │ │    Redis        │
│   Firebase      │ │ Genkit +    │ │                 │
│                 │ │ DeepSeek    │ │                 │
└─────────────────┘ └─────────────┘ └─────────────────┘
```

### 核心组件交互关系

#### 1. 用户认证流程
```mermaid
sequenceDiagram
    participant U as 用户
    participant F as Frontend
    participant FA as Firebase Auth
    participant DB as PostgreSQL
    
    U->>F: 登录请求
    F->>FA: 验证凭据
    FA->>F: 返回JWT Token
    F->>DB: 创建/更新用户记录
    DB->>F: 确认用户信息
    F->>U: 登录成功
```

#### 2. AI分析流程
```mermaid
sequenceDiagram
    participant U as 用户
    participant API as API Layer
    participant AI as AI Service
    participant DB as Database
    
    U->>API: 请求AI分析
    API->>DB: 获取交易数据
    DB->>API: 返回交易记录
    API->>AI: 调用AI分析服务
    AI->>API: 返回分析结果
    API->>DB: 保存分析报告
    API->>U: 返回分析结果
```

### 关键技术选型和设计决策

| 技术领域 | 选型 | 设计决策理由 |
|---------|------|-------------|
| **前端框架** | Next.js 15.3.3 | App Router支持、SSR/SSG能力、优秀的开发体验 |
| **数据库** | PostgreSQL + Prisma | 关系型数据库的ACID特性、复杂查询支持、类型安全的ORM |
| **认证系统** | Firebase Auth | 成熟的认证解决方案、多种登录方式支持 |
| **AI服务** | Google Genkit + DeepSeek | 多AI提供商支持、灵活的模型切换能力 |
| **支付系统** | 微信支付V3 | 国内用户友好、完整的订阅管理 |
| **缓存系统** | Redis | 高性能缓存、会话管理 |
| **容器化** | Docker + Docker Compose | 环境一致性、便于部署和扩展 |

## 🚀 技术栈

### 前端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 15.3.3 | React全栈框架，支持SSR/SSG |
| **React** | 18.3.1 | 用户界面库 |
| **TypeScript** | 5.x | 类型安全开发 |
| **Tailwind CSS** | 3.4.1 | 原子化CSS框架 |
| **Radix UI** | 最新版 | 无障碍UI组件库 |
| **React Hook Form** | 7.54.2 | 高性能表单管理 |
| **Zod** | 3.24.2 | 运行时类型验证 |
| **Recharts** | 2.15.1 | 数据可视化图表 |
| **Lucide React** | 0.475.0 | 现代图标库 |

### 后端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| **PostgreSQL** | 15+ | 主数据库 |
| **Prisma** | 6.17.1 | 数据库ORM |
| **Firebase** | 11.9.1 | 用户认证和实时数据 |
| **Redis** | 7+ | 缓存和会话存储 |
| **Google Genkit** | 1.20.0 | AI服务框架 |
| **DeepSeek API** | 最新 | AI模型服务 |
| **微信支付V3** | 3.0.2 | 支付处理 |

### AI服务架构
系统支持多AI提供商，通过环境变量 `AI_PROVIDER` 灵活切换：

- **Google Genkit**: 使用Gemini模型，适合复杂分析任务
- **DeepSeek API**: 高性价比的中文优化模型

## 🛠️ 部署方式

### 环境要求

- **Node.js**: 版本 >= 20.0.0
- **PostgreSQL**: 版本 >= 15.0
- **Redis**: 版本 >= 7.0 (可选，用于缓存)
- **Docker**: 版本 >= 20.0 (容器化部署)

### 开发环境部署

#### 1. 克隆仓库
```bash
git clone https://github.com/your-repo/Trade-Insight-AI.git
cd Trade-Insight-AI
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 环境变量配置
创建 `.env.local` 文件：

```env
# 数据库配置
DATABASE_URL="postgresql://trade_user:trade_password_2024@localhost:5432/trade_insight_ai"

# Redis配置 (可选)
REDIS_HOST=localhost
REDIS_PORT=6379

# Firebase配置
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI服务配置
AI_PROVIDER=deepseek  # 可选: 'google' 或 'deepseek'

# DeepSeek API配置
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Google AI配置 (如果使用Google AI)
GEMINI_API_KEY=your_gemini_api_key

# 微信支付配置
WX_APPID=your_wechat_app_id
WX_MCHID=your_merchant_id
WX_V3_CODE=your_api_v3_key
WX_SERIAL_NO=your_certificate_serial_no
WX_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
your_private_key_content
-----END PRIVATE KEY-----"
WX_NOTIFY_URL=https://your-domain.com/api/subscription/notify

# 微信公众号配置（用于扫码登录）
WECHAT_APPID=your_wechat_mp_app_id  # 公众号AppID（可与支付共用或单独配置）
WECHAT_APPSECRET=your_wechat_mp_app_secret  # 公众号AppSecret
WECHAT_TOKEN=your_wechat_token  # 公众号消息Token（在后台设置）
WECHAT_ORIGINAL_ID=gh_xxxxxxxx  # 公众号原始ID

# NextAuth配置
NEXTAUTH_URL=http://localhost:9002
NEXTAUTH_SECRET=your_nextauth_secret
```

#### 4. 数据库初始化
```bash
# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npm run db:migrate

# 种子数据 (可选)
npm run db:seed
```

#### 5. 启动开发服务器
```bash
# 启动主应用
npm run dev

# 启动AI服务 (另一个终端)
npm run genkit:dev
```

访问 `http://localhost:9002` 查看应用。

### 生产环境部署

#### Docker容器化部署 (推荐)

##### 1. 使用Docker Compose
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

##### 2. 服务配置说明
- **PostgreSQL**: 端口5432，数据持久化到 `./postgres_data`
- **Redis**: 端口6379，数据持久化到 `./redis_data`
- **应用服务**: 端口9002，使用预构建镜像

##### 3. 环境差异配置

| 环境 | 数据库 | 缓存 | AI服务 | 支付 |
|------|--------|------|--------|------|
| **开发** | 本地PostgreSQL | 可选Redis | DeepSeek API | 测试环境 |
| **测试** | 容器PostgreSQL | Redis | Google Genkit | 沙盒环境 |
| **生产** | 云数据库 | Redis集群 | 多AI负载均衡 | 正式环境 |

#### 传统部署方式

##### 1. 构建生产版本
```bash
# 类型检查
npm run typecheck

# 构建应用
npm run build

# 启动生产服务器
npm start
```

##### 2. 使用PM2管理进程
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "trade-insight-ai" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs trade-insight-ai
```

### 部署到云平台

#### Vercel部署
1. 连接GitHub仓库到Vercel
2. 配置环境变量
3. 设置构建命令: `npm run build`
4. 设置输出目录: `.next`

#### Firebase Hosting部署
```bash
# 安装Firebase CLI
npm install -g firebase-tools

# 登录Firebase
firebase login

# 初始化项目
firebase init hosting

# 部署
firebase deploy
```

## 💾 存储方案

### 数据库架构

#### PostgreSQL主数据库
系统使用PostgreSQL作为主数据库，通过Prisma ORM进行管理。

##### 核心数据模型

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    firebase_uid VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 交易日志表
CREATE TABLE trade_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trade_time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    direction trade_direction NOT NULL,
    position_size VARCHAR(100) NOT NULL,
    entry_reason TEXT,
    exit_reason TEXT,
    trade_result TEXT NOT NULL,
    mindset_state TEXT NOT NULL,
    lessons_learned TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订阅表
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id plan_id NOT NULL,
    status subscription_status DEFAULT 'inactive',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    payment_provider payment_provider NOT NULL,
    payment_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI分析报告表
CREATE TABLE daily_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    summary TEXT NOT NULL,
    strengths TEXT NOT NULL,
    weaknesses TEXT NOT NULL,
    emotional_impact TEXT NOT NULL,
    improvement_suggestions TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);
```

##### 枚举类型定义
```sql
-- 交易方向
CREATE TYPE trade_direction AS ENUM ('Buy', 'Sell', 'Long', 'Short', 'Close');

-- 订阅状态
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'trialing');

-- 订阅计划
CREATE TYPE plan_id AS ENUM ('monthly', 'quarterly', 'semi_annually', 'annually');

-- 支付提供商
CREATE TYPE payment_provider AS ENUM ('wechat_pay', 'alipay', 'stripe');
```

#### 数据库索引优化
```sql
-- 性能优化索引
CREATE INDEX idx_trade_logs_user_id ON trade_logs(user_id);
CREATE INDEX idx_trade_logs_trade_time ON trade_logs(trade_time);
CREATE INDEX idx_trade_logs_symbol ON trade_logs(symbol);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_daily_analyses_user_id ON daily_analyses(user_id);
CREATE INDEX idx_daily_analyses_date ON daily_analyses(date);
```

### 数据迁移和初始化

#### 1. 数据库迁移脚本
```bash
# 运行迁移
npm run db:migrate

# 重置数据库
npm run db:reset

# 清理数据
npm run db:clean
```

#### 2. 初始化脚本 (`scripts/init-db.sql`)
```sql
-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建数据库
CREATE DATABASE trade_insight_ai;

-- 设置时区
SET timezone = 'UTC';
```

#### 3. 种子数据 (`scripts/seed-db.ts`)
```typescript
// 创建测试用户和示例数据
async function seedDatabase() {
  // 创建测试用户
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      firebaseUid: 'test-firebase-uid'
    }
  });

  // 创建示例交易记录
  await prisma.tradeLog.createMany({
    data: [
      {
        userId: testUser.id,
        tradeTime: new Date(),
        symbol: 'AAPL',
        direction: 'Buy',
        positionSize: '100股',
        entryReason: '技术分析看涨',
        tradeResult: '+$500',
        mindsetState: '冷静分析',
        lessonsLearned: '严格执行止损'
      }
    ]
  });
}
```

### Redis缓存策略

#### 缓存配置
```typescript
// lib/redis.ts
import Redis from 'redis';

export const redis = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0
});

// 缓存策略
export const cacheConfig = {
  userSession: { ttl: 3600 }, // 1小时
  tradeData: { ttl: 1800 },   // 30分钟
  aiAnalysis: { ttl: 86400 }  // 24小时
};
```

## 📊 版本更新说明

### v2.0.0 (当前版本) - 2024年12月
#### 🎉 重大更新
- **新增**: PostgreSQL数据库支持，替代Firebase Firestore作为主数据库
- **新增**: Redis缓存系统，提升应用性能
- **新增**: Docker容器化部署支持
- **新增**: 多AI提供商支持 (Google Genkit + DeepSeek API)
- **新增**: 完整的订阅管理系统，集成微信支付
- **改进**: 全面重构数据模型，支持更复杂的查询和分析
- **改进**: 优化AI分析流程，提供更准确的交易洞察

#### 🔧 技术改进
- 升级到Next.js 15.3.3，支持最新的App Router
- 引入Prisma ORM，提供类型安全的数据库操作
- 实现多环境部署配置 (开发/测试/生产)
- 添加完整的错误处理和日志记录

#### 🐛 修复问题
- 修复Firebase认证在生产环境的稳定性问题
- 解决大量交易数据的性能瓶颈
- 修复AI分析结果的一致性问题

### v1.0.0 - 2024年10月
#### 🎉 首次发布
- **基础功能**: 交易日志记录和管理
- **AI分析**: 基于Google Genkit的每日/每周/月度分析
- **用户认证**: Firebase Authentication集成
- **数据存储**: Firebase Firestore数据库
- **UI设计**: 基于shadcn/ui的现代化界面

## 🔄 变更历史

### 架构演进
```
v1.0.0: Firebase Only
├── Frontend: Next.js + React
├── Auth: Firebase Auth
├── Database: Firestore
└── AI: Google Genkit

v2.0.0: 混合架构 (当前)
├── Frontend: Next.js 15.3.3 + React 18.3.1
├── Auth: Firebase Auth
├── Database: PostgreSQL (主) + Firebase (辅)
├── Cache: Redis
├── AI: Google Genkit + DeepSeek API
├── Payment: 微信支付V3
└── Deployment: Docker + Docker Compose
```

### 数据迁移指南
从v1.0.0升级到v2.0.0需要进行数据迁移：

```bash
# 1. 备份Firebase数据
npm run backup:firebase

# 2. 运行迁移脚本
npm run migrate:v1-to-v2

# 3. 验证数据完整性
npm run verify:migration
```

## 🤝 贡献指南

### 开发流程
1. Fork项目仓库
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 创建Pull Request

### 代码规范
- 使用TypeScript进行类型安全开发
- 遵循ESLint和Prettier配置
- 编写单元测试覆盖核心功能
- 更新相关文档

## 📄 许可协议

本项目采用 **商业源代码许可 (Business Source License 1.1)**。

- **非商业用途**: 您可以自由地使用、复制、修改和分发本软件，但仅限于非商业目的。
- **商业用途**: 任何将本软件用于商业产品或服务的行为，都必须获得我们的商业许可。

**简而言之**:
- 🟢 **允许**: 个人学习、研究、运行在您自己的服务器上用于个人交易分析。
- 🔴 **禁止**: 在未获得商业许可的情况下，将本软件作为付费产品（SaaS）提供给他人，或将其集成到您的商业产品中。

在 **3 年** 后，本项目的许可将自动转换为对商业使用更友好的 **Apache License 2.0**。

如果您对商业许可感兴趣，请联系我们。

## 📞 支持与联系

- **技术文档**: [查看详细技术文档](./docs/technical-documentation.md)
- **问题反馈**: [GitHub Issues](https://github.com/your-repo/Trade-Insight-AI/issues)
- **功能建议**: [GitHub Discussions](https://github.com/your-repo/Trade-Insight-AI/discussions)

---
*本README文档由AI协助编写，确保内容的准确性和完整性。*
