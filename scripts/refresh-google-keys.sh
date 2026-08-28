#!/usr/bin/env bash
# 从能访问 Google 的网络（如本地开发机）下载 Firebase securetoken 公钥并写入项目，
# 用于服务端验签 Firebase ID Token（避免在墙内服务器上 fetch Google 公钥）。
#
# 何时运行：Google 大约每 1 周轮换签名公钥；过期前需运行本脚本，然后重新部署。
# 现象：如果不更新，登录会日志报 "JWKSNoMatchingKey" 或类似错误。
#
# 用法（在能访问 google.com 的机器上）：
#   ./scripts/refresh-google-keys.sh
#   git diff src/lib/google-securetoken-jwks.json   # 确认 kid 变了
#   # 重新 build/部署
set -euo pipefail

DEST="$(dirname "$0")/../src/lib/google-securetoken-jwks.json"
URL="https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

curl -fsSL --max-time 10 "$URL" > "$TMP"

# 校验响应是有效 JWKS（含 keys 数组）
if ! python3 -c "import json,sys; d=json.load(open('$TMP')); assert isinstance(d.get('keys'), list) and len(d['keys'])>0, 'invalid JWKS'" >/dev/null 2>&1; then
  echo "ERROR: 下载的内容不是有效 JWKS" >&2
  exit 1
fi

mv "$TMP" "$DEST"
trap - EXIT

echo "✓ 公钥已更新: $DEST"
python3 -c "import json; d=json.load(open('$DEST')); print('  共', len(d['keys']), '个公钥, kid:', [k['kid'][:12]+'...' for k in d['keys']])"
echo
echo "下一步: 重新 build + 部署 (docker buildx + load + recreate)"
