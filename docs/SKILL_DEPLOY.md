# Sales Assistant 部署文档

## 概述

本文档记录 sales-assistant Next.js 项目的部署流程，包括生产环境构建、pm2 进程管理和 frpc 内网穿透配置。

## 访问地址

| 环境 | 地址 |
|------|------|
| 本地 | http://localhost:3000 |
| 外网 IP | http://8.145.52.139:16080 |
| 域名 | https://autoai.vf-tech.cn |

## 技术栈

- **框架**: Next.js 15.5.12
- **数据库**: PostgreSQL + Prisma 5.22.0
- **AI SDK**: Vercel AI SDK 3.4.33
- **进程管理**: PM2
- **内网穿透**: frpc (客户端) -> frps (服务端 8.145.52.139:7000)

## 部署步骤

### 1. 环境准备

```bash
# 安装 Node.js (如果未安装)
# 安装 PM2
npm install -g pm2

# 安装项目依赖
cd /home/alibambjhome/.openclaw/workspace/projects/sales-assistant
npm install
```

### 2. 环境变量配置

在 `.env` 文件中配置以下变量：

```bash
# 数据库连接
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# JWT 密钥 (生产环境必须设置)
JWT_SECRET="your-secret-key-here"
```

### 3. Prisma 客户端生成

```bash
npx prisma generate
```

### 4. 生产构建

```bash
npm run build
```

### 5. 使用 PM2 启动

```bash
npx pm2 start npm --name "sales-assistant" -- run start
```

### 6. 验证部署

```bash
# 检查 PM2 状态
pm2 status

# 测试本地访问
curl -I http://localhost:3000/login

# 测试外网访问
curl -I http://8.145.52.139:16080/login
```

## PM2 管理

### 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs sales-assistant

# 重启
pm2 restart sales-assistant

# 停止
pm2 stop sales-assistant

# 删除
pm2 delete sales-assistant

# 开机自启
pm2 save
pm2 startup
```

### 日志位置

- PM2 日志: `~/.pm2/logs/`
- 应用日志: 通过 `pm2 logs sales-assistant` 查看

## frpc 内网穿透配置

### 客户端配置

文件位置: `/etc/frp/frpc.toml`

```toml
serverAddr = "8.145.52.139"
serverPort = 7000

auth.method = "token"
auth.token = "vftwebserver_frps_token_2025_Kx9mP2wR8nQ4vT7yL"

[[proxies]]
name = "nextjs-web"
type = "tcp"
localIP = "127.0.0.1"
localPort = 3000
remotePort = 16080
```

### 管理命令

```bash
# 启动
systemctl start frpc

# 停止
systemctl stop frpc

# 状态
systemctl status frpc

# 重启
systemctl restart frpc
```

## 安全注意事项

1. **禁止使用 dev 模式** - 开发模式不应暴露到公网
2. **JWT_SECRET 必须设置** - 生产环境必须配置强密钥
3. **定期更新依赖** - 关注安全更新
4. **日志监控** - 定期检查 PM2 日志

## 故障排除

### 构建失败

```bash
# 清理缓存后重试
rm -rf .next node_modules/.prisma
npm install
npx prisma generate
npm run build
```

### 端口被占用

```bash
# 查找占用进程
lsof -i :3000

# 停止占用进程
kill <PID>
```

### 数据库连接失败

```bash
# 检查 DATABASE_URL
echo $DATABASE_URL

# 测试数据库连接
npx prisma db push --dry-run
```

## 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建
npm run build

# 3. 重启应用
pm2 restart sales-assistant
```

## 联系支持

如有问题，请检查：
1. PM2 日志: `pm2 logs sales-assistant`
2. frpc 状态: `systemctl status frpc`
3. 端口占用: `lsof -i :3000`
