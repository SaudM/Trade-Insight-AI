#!/bin/bash

# --- 配置部分 ---
SERVER_USER="work"
SERVER_IP="47.92.165.32"
IMAGE_NAME="submit2mxh/trade-gpt-image"
TAG="latest"
REMOTE_PROJECT_PATH="/home/work/Trade-Tend-Insight"
PLATFORM="linux/amd64"

# --- 脚本逻辑 ---

export DOCKER_API_VERSION=1.42

# 1. 确保本地编译为 AMD64 架构
echo "🚀 1/4: 正在本地构建跨平台镜像 ($PLATFORM)..."
docker buildx build --platform $PLATFORM -t ${IMAGE_NAME}:${TAG} --load .

if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请检查 Dockerfile"
    exit 1
fi


# 2. 压缩并传输镜像 (通过管道直接导入服务器 Docker)
echo "📦 3/4: 正在通过 SSH 传输并加载镜像 (预计需要几十秒)..."
docker save ${IMAGE_NAME}:${TAG} | gzip | ssh ${SERVER_USER}@${SERVER_IP} "gunzip | docker load"

if [ $? -ne 0 ]; then
    echo "❌ 镜像传输或加载失败，请检查服务器磁盘空间或 SSH 连接"
    exit 1
fi

# 3. 远程重启服务
echo "🔄 4/4: 正在服务器上重启容器并清理旧镜像..."
ssh ${SERVER_USER}@${SERVER_IP} << EOF
    cd ${REMOTE_PROJECT_PATH}
    # 强制重新创建容器，确保加载刚上传的最新镜像
    docker-compose up -d --force-recreate
    # 自动清理 <none> 标签的旧镜像，节省阿里云磁盘空间
    docker image prune -f
EOF

if [ $? -eq 0 ]; then
    echo "✅ [SUCCESS] 部署完成！项目已在服务器运行。"
else
    echo "❌ [ERROR] 远程操作失败。"
fi