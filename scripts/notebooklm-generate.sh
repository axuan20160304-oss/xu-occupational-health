#!/bin/bash
##############################################################################
# NotebookLM 自动生成 & 发布脚本
#
# 用法：
#   ./scripts/notebooklm-generate.sh <notebook_id> <type> <title> [description]
#
# 参数：
#   notebook_id  — NotebookLM笔记本ID (可通过 notebooklm list 查看)
#   type         — 生成类型: infographic | slide-deck
#   title        — 内容标题
#   description  — 描述 (可选)
#
# 示例：
#   ./scripts/notebooklm-generate.sh 1863efaf infographic "噪声聋防治信息图"
#   ./scripts/notebooklm-generate.sh 1863efaf slide-deck "噪声聋培训课件"
#
# 完整流程：
#   1. 选中NotebookLM笔记本
#   2. 生成内容 (infographic/slide-deck)
#   3. 等待生成完成
#   4. 下载到本地
#   5. 复制到网站 uploads 目录
#   6. 通过 openclaw-publish.mjs 更新 manifest + git + deploy
##############################################################################

set -euo pipefail

# === 配置 ===
VENV="/Users/xuguangjun/.notebooklm-env"
SITE_DIR="/Users/xuguangjun/徐广军个人网站/site"
NODE="/Users/xuguangjun/.local/node-v22.13.1-darwin-arm64/bin/node"
PUBLISH_SCRIPT="$SITE_DIR/scripts/openclaw-publish.mjs"
PROXY="http://127.0.0.1:7897"
TMP_DIR="/tmp/notebooklm-output"

# 代理环境变量 (中国网络必须)
export HTTPS_PROXY="$PROXY"
export HTTP_PROXY="$PROXY"
export ALL_PROXY="$PROXY"

# === 参数检查 ===
if [ $# -lt 3 ]; then
  echo "❌ 用法: $0 <notebook_id> <type> <title> [description]"
  echo "   type: infographic | slide-deck"
  echo ""
  echo "   示例: $0 1863efaf infographic \"噪声聋信息图\""
  exit 1
fi

NB_ID="$1"
TYPE="$2"
TITLE="$3"
DESC="${4:-NotebookLM自动生成}"

# === 激活虚拟环境 ===
source "$VENV/bin/activate"

# === 确定模块和文件扩展名 ===
if [ "$TYPE" = "infographic" ]; then
  MODULE="images"
  EXT="png"
  SUBDIR="images"
elif [ "$TYPE" = "slide-deck" ]; then
  MODULE="ppts"
  EXT="pdf"
  SUBDIR="ppts"
else
  echo "❌ 不支持的类型: $TYPE (仅支持 infographic, slide-deck)"
  exit 1
fi

# 生成安全文件名
SAFE_TITLE=$(echo "$TITLE" | sed 's/[^a-zA-Z0-9\u4e00-\u9fff]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
TIMESTAMP=$(date +%s | tail -c 7)
FILENAME="notebooklm-${SAFE_TITLE}-${TIMESTAMP}.${EXT}"
TMP_FILE="$TMP_DIR/$FILENAME"
FINAL_DIR="$SITE_DIR/public/uploads/$SUBDIR"

mkdir -p "$TMP_DIR" "$FINAL_DIR"

echo "🚀 NotebookLM 自动生成 & 发布"
echo "   笔记本: $NB_ID"
echo "   类型:   $TYPE → $MODULE"
echo "   标题:   $TITLE"
echo ""

# === Step 1: 选中笔记本 ===
echo "📓 Step 1: 选中笔记本..."
notebooklm use "$NB_ID" 2>&1 | head -5

# === Step 2: 生成内容 ===
echo ""
echo "⚙️  Step 2: 生成 $TYPE ..."
if [ "$TYPE" = "infographic" ]; then
  RESULT=$(notebooklm generate infographic --orientation landscape 2>&1)
else
  RESULT=$(notebooklm generate slide-deck 2>&1)
fi
echo "   $RESULT"

# 提取 task ID
TASK_ID=$(echo "$RESULT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
if [ -z "$TASK_ID" ]; then
  echo "❌ 无法获取生成任务ID"
  exit 1
fi
echo "   任务ID: $TASK_ID"

# === Step 3: 等待完成 ===
echo ""
echo "⏳ Step 3: 等待生成完成..."
MAX_WAIT=180
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  STATUS=$(notebooklm artifact poll "$TASK_ID" 2>&1 | grep -o "status='[^']*'" | head -1 | sed "s/status='//;s/'//")
  if [ "$STATUS" = "completed" ]; then
    echo "   ✅ 生成完成!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "   ❌ 生成失败!"
    exit 1
  fi
  echo "   ⏳ 状态: $STATUS (已等 ${WAITED}s / ${MAX_WAIT}s)"
  sleep 10
  WAITED=$((WAITED + 10))
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "   ⚠️ 超时，继续尝试下载..."
fi

# === Step 4: 下载 ===
echo ""
echo "⬇️  Step 4: 下载 $TYPE ..."
notebooklm download "$TYPE" "$TMP_FILE" 2>&1
if [ ! -f "$TMP_FILE" ]; then
  echo "❌ 下载失败: $TMP_FILE 不存在"
  exit 1
fi
SIZE=$(ls -lh "$TMP_FILE" | awk '{print $5}')
echo "   ✅ 已下载: $FILENAME ($SIZE)"

# === Step 5: 复制到网站 ===
echo ""
echo "📁 Step 5: 复制到网站..."
cp "$TMP_FILE" "$FINAL_DIR/$FILENAME"
echo "   → $FINAL_DIR/$FILENAME"

# === Step 6: 通过 openclaw-publish 推送 ===
echo ""
echo "🚀 Step 6: 推送到网站..."

# 构建 JSON (转义引号)
ESCAPED_TITLE=$(echo "$TITLE" | sed 's/"/\\"/g')
ESCAPED_DESC=$(echo "$DESC" | sed 's/"/\\"/g')

JSON="{\"module\":\"$MODULE\",\"title\":\"$ESCAPED_TITLE\",\"description\":\"$ESCAPED_DESC\",\"filename\":\"$FILENAME\",\"tags\":[\"NotebookLM\",\"自动生成\"],\"source\":\"NotebookLM\"}"

echo "$JSON" | "$NODE" "$PUBLISH_SCRIPT" 2>&1

echo ""
echo "✅ 全部完成!"
echo "   📋 $TITLE"
echo "   🌐 https://site-nine-chi-41.vercel.app/$MODULE"
