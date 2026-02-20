#!/bin/bash
# Auto-deploy watcher for OpenClaw content
# Monitors content directory for new/modified files, auto-commits and pushes to trigger Vercel deploy
# Run via launchd or cron every 2 minutes

SITE_DIR="/Users/xuguangjun/徐广军个人网站/site"
LOG_FILE="/Users/xuguangjun/.openclaw/logs/auto-deploy.log"

cd "$SITE_DIR" || exit 1

# Run PDF finder for any new standard files that need PDFs
NODE="/Users/xuguangjun/.local/node-v22.13.1-darwin-arm64/bin/node"
PDF_SCRIPT="$SITE_DIR/scripts/auto-pdf-finder.mjs"
if [ -f "$PDF_SCRIPT" ]; then
  echo "[$TIMESTAMP] Running PDF finder..." >> "$LOG_FILE"
  $NODE "$PDF_SCRIPT" >> "$LOG_FILE" 2>&1
fi

# Check for uncommitted changes in content/ and public/uploads/
CHANGES=$(git status --porcelain content/ public/uploads/ 2>/dev/null)

if [ -z "$CHANGES" ]; then
  exit 0
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] Detected changes:" >> "$LOG_FILE"
echo "$CHANGES" >> "$LOG_FILE"

# Stage content and uploads
git add content/ public/uploads/ 2>/dev/null

# Count new files
NEW_COUNT=$(echo "$CHANGES" | grep -c "^??\|^ M\|^A ")

# Build commit message
COMMIT_MSG="auto: OpenClaw内容自动部署 (${NEW_COUNT}个文件变更)"

# Get first new file name for better commit message
FIRST_FILE=$(echo "$CHANGES" | head -1 | sed 's/^.. //' | xargs basename 2>/dev/null)
if [ -n "$FIRST_FILE" ]; then
  COMMIT_MSG="auto: 添加 ${FIRST_FILE} 等${NEW_COUNT}个文件"
fi

git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
  echo "[$TIMESTAMP] Git commit failed" >> "$LOG_FILE"
  exit 1
fi

echo "[$TIMESTAMP] Committed: $COMMIT_MSG" >> "$LOG_FILE"

# Push to trigger Vercel auto-deploy
git push origin main >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
  echo "[$TIMESTAMP] Pushed to origin/main" >> "$LOG_FILE"
  
  # Build and deploy to Vercel
  echo "[$TIMESTAMP] Building and deploying to Vercel..." >> "$LOG_FILE"
  npm run build >> "$LOG_FILE" 2>&1
  npx vercel --prod --yes >> "$LOG_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    echo "[$TIMESTAMP] ✅ Vercel deploy success" >> "$LOG_FILE"
  else
    echo "[$TIMESTAMP] ⚠️ Vercel deploy failed (git push done, Vercel may auto-deploy later)" >> "$LOG_FILE"
  fi
else
  echo "[$TIMESTAMP] Push failed — will retry next cycle" >> "$LOG_FILE"
fi
