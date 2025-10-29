#!/bin/bash
set -e

# =============================
# 🚀 Next.js Standalone 多平台构建脚本
# =============================

IMAGE_NAME="submit2mxh/trade-gpt-image:latest"
PLATFORMS="linux/arm64/v8"
#linux/amd64,linux/arm64/v8

# （可选）代理设置
export https_proxy="http://127.0.0.1:12334"
export http_proxy="http://127.0.0.1:12334"

echo "============================="
echo "🔧 检查 Prisma..."
echo "============================="

if [ ! -d "prisma" ]; then
  echo "❌ 错误: 找不到 Prisma 目录"
  exit 1
fi

mkdir -p prisma/migrations/20251022145801_baseline
if [ ! -f "prisma/migrations/20251022145801_baseline/migration.sql" ]; then
  echo "-- 初始数据库架构" > prisma/migrations/20251022145801_baseline/migration.sql
  echo "✅ 创建空迁移文件"
fi

echo "============================="
echo "🧩 生成 Prisma 客户端..."
echo "============================="
npx prisma generate

echo "============================="
echo "🛠️ 构建 Next.js Standalone..."
echo "============================="
npm run build

if [ ! -d ".next/standalone" ]; then
  echo "❌ 错误: 未检测到 .next/standalone，请确保 next.config.ts 设置了 output: 'standalone'"
  exit 1
fi

echo "============================="
echo "🐳 构建多平台 Docker 镜像..."
echo "============================="

docker buildx create --use --name multiarch-builder 2>/dev/null || true
docker buildx inspect multiarch-builder --bootstrap

docker buildx build \
  --platform ${PLATFORMS} \
  -t ${IMAGE_NAME} \
  --push .

echo "============================="
echo "✅ 镜像构建并推送完成！"
echo "   - 镜像: ${IMAGE_NAME}"
echo "   - 支持平台: ${PLATFORMS}"
echo "============================="
