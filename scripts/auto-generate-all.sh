#!/bin/bash
##############################################################################
# 网站内容全自动维护脚本（入口）
# 每小时自动运行：维护 标准+文章+图片+PPT+网站健康检查
#
# 用法：
#   ./auto-generate-all.sh           # 完整维护
#   ./auto-generate-all.sh --check   # 仅检查不修改
#
# 实际工作由 Node.js 脚本完成：
#   - site-auto-maintain.mjs    → 综合维护（调度中心）
#   - standards-auto-update.mjs → 标准模块自动更新
#   - openclaw-publish.mjs      → 内容发布（文章/图片/PPT）
#
# 定时任务（crontab -e）：
#   0 * * * * cd /Users/xuguangjun/徐广军个人网站/site && /usr/local/bin/node scripts/site-auto-maintain.mjs >> /tmp/site-maintain.log 2>&1
#
# 查看状态：
#   cat /tmp/site-maintain-health.json   # 综合健康状态
#   cat /tmp/standards-update-health.json # 标准模块状态
#   tail -50 /tmp/site-maintain.log      # 最近日志
##############################################################################

set -euo pipefail

SITE_DIR="/Users/xuguangjun/徐广军个人网站/site"
NODE="/usr/local/bin/node"

echo "╔══════════════════════════════════════╗"
echo "║  网站全模块自动维护                  ║"
echo "╚══════════════════════════════════════╝"

# 调用 Node.js 综合维护脚本
$NODE "$SITE_DIR/scripts/site-auto-maintain.mjs" "$@"

echo ""
echo "📊 健康状态："
cat /tmp/site-maintain-health.json 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    r = d.get('report', {})
    print(f\"  状态: {d['status']}\")
    print(f\"  标准: {r.get('standards',{}).get('message','?')}\")
    print(f\"  文章: {r.get('articles',{}).get('message','?')}\")
    print(f\"  图片: {r.get('images',{}).get('message','?')}\")
    print(f\"  PPT:  {r.get('ppts',{}).get('message','?')}\")
    print(f\"  网站: {r.get('website',{}).get('message','?')}\")
    if d.get('errors'):
        print(f\"  ⚠️ 错误: {len(d['errors'])}个\")
except: print('  (无法解析)')
" 2>/dev/null || echo "  (健康状态文件不存在)"

echo ""
echo "🌐 网站地址："
echo "  本地: http://localhost:3000"
echo "  国内: https://2046f398.r16.cpolar.top"
echo "  Vercel: https://site-nine-chi-41.vercel.app"
