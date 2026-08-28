# ==============================
# 1️⃣ Build Stage
# ==============================
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm ci --legacy-peer-deps

# 复制所有源文件
COPY . .

# 生成 Prisma 客户端（非常关键）
RUN npx prisma generate

# 构建 Next.js standalone 应用
RUN npm run build

# ==============================
# 2️⃣ Runtime Stage
# ==============================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# 复制 standalone 构建产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p ./public
COPY --from=builder /app/public ./public

# 复制 Prisma schema (用于 prisma db push)
COPY --from=builder /app/prisma ./prisma

# 全局安装 prisma CLI (用于 prisma db push)
# 固定版本为 6.17.1，与项目保持一致，避免 Prisma 7.x 破坏性变更
RUN npm config set registry https://registry.npmmirror.com && npm install -g prisma@6.17.1

# 安全加固：以内置非 root 用户 node 运行，限制 RCE 的爆炸半径。
# 运行期仅 .next/cache 需可写（Next standalone ISR 缓存）；prisma db push 只读 schema。
RUN mkdir -p /app/.next/cache && chown -R node:node /app
USER node

# 启动 standalone 服务 (使用 prisma db push 更新数据库)
CMD ["sh", "-c", "prisma db push && node server.js"]
