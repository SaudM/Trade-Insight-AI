# ==============================
# 1️⃣ Build Stage
# ==============================
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

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

# ✅ 复制 Prisma 相关目录（关键）
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# 启动 standalone 服务
CMD ["node", "server.js"]
