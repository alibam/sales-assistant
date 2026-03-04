#!/bin/bash
# ============================================================================
# Sales Assistant 部署脚本 (含物理熔断机制)
#
# 流程：
# 1. 生成 Prisma 客户端
# 2. TypeScript 类型检查（熔断点 1）
# 3. 构建生产环境（熔断点 2）
# 4. 运行 Playwright E2E 测试（熔断点 3）
# 5. 重启 PM2 服务
#
# 安全机制：
# - 如果 TypeScript 类型检查失败，部署脚本立即 exit 1
# - 如果生产构建失败，部署脚本立即 exit 1
# - 如果 E2E 测试失败，部署脚本立即 exit 1
# - 绝对不允许带病重启 PM2 进程
# ============================================================================

set -e  # 任何命令失败立即退出

PROJECT_DIR="/home/alibambjhome/.openclaw/workspace/projects/sales-assistant"
APP_NAME="sales-assistant"

echo "=========================================="
echo "🚀 Sales Assistant 部署开始"
echo "=========================================="

cd "$PROJECT_DIR"

# 步骤 1: 生成 Prisma 客户端
echo ""
echo "📦 步骤 1/5: 生成 Prisma 客户端..."
npx prisma generate

# 步骤 2: TypeScript 类型检查（熔断点 1）
echo ""
echo "🔍 步骤 2/5: TypeScript 类型检查..."
echo "⚠️  如果类型检查失败，部署将立即终止！"
echo ""

if ! npx tsc --noEmit; then
    echo ""
    echo "❌ TypeScript 类型检查失败！"
    echo "🚫 部署已终止，PM2 未重启"
    echo "请修复类型错误后重新部署"
    exit 1
fi

echo ""
echo "✅ TypeScript 类型检查通过！"

# 步骤 3: 构建生产环境（熔断点 2）
echo ""
echo "🏗️  步骤 3/5: 构建生产环境..."
echo "⚠️  如果构建失败，部署将立即终止！"
echo ""

if ! npm run build; then
    echo ""
    echo "❌ 生产构建失败！"
    echo "🚫 部署已终止，PM2 未重启"
    echo "请修复构建错误后重新部署"
    exit 1
fi

echo ""
echo "✅ 生产构建成功！"

# 步骤 4: 运行 E2E 测试（熔断点 3）
echo ""
echo "🧪 步骤 4/5: 运行 E2E 测试..."
echo "⚠️  如果测试失败，部署将立即终止！"
echo ""

# 运行 Playwright 测试
# --project=chromium: 只运行 Chromium 浏览器
# --reporter=list: 使用简洁的列表报告
if ! npx playwright test --project=chromium --reporter=list; then
    echo ""
    echo "❌ E2E 测试失败！"
    echo "🚫 部署已终止，PM2 未重启"
    echo "请修复测试失败的问题后重新部署"
    exit 1
fi

echo ""
echo "✅ E2E 测试通过！"

# 步骤 5: 重启 PM2 服务
echo ""
echo "🔄 步骤 5/5: 重启 PM2 服务..."
pm2 restart "$APP_NAME" --update-env

# 等待服务启动
sleep 3

# 验证服务状态
echo ""
echo "🔍 验证服务状态..."
pm2 status "$APP_NAME"

# 健康检查
echo ""
echo "🏥 健康检查..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login)

if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ 健康检查通过 (HTTP $HEALTH_STATUS)"
else
    echo "⚠️  健康检查异常 (HTTP $HEALTH_STATUS)"
fi

echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  - 本地: http://localhost:3000"
echo "  - 外网: http://8.145.52.139:16080"
echo "  - 域名: https://autoai.vf-tech.cn"
echo ""
echo "查看日志: pm2 logs $APP_NAME"
echo ""
