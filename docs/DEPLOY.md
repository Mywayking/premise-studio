# Premise Studio - 部署文档

## 环境要求

- Node.js 18+
- pnpm 8+ (推荐) 或 npm 9+
- DeepSeek API Key (或其他 AI 提供商)

## 快速开始

### 1. 克隆项目

```bash
git clone <repo-url>
cd premise-studio
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```bash
# 必选：至少配置一个 AI 提供商
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 可选：如果需要使用其他提供商
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

AI 提供商优先级：`DEEPSEEK_API_KEY > ANTHROPIC_API_KEY > OPENAI_API_KEY`

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 5. 生产构建

```bash
pnpm build
pnpm start
```

## 部署到 Vercel

### 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### 手动部署

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量：
   - `DEEPSEEK_API_KEY`
4. 框架预设自动检测为 Next.js
5. 部署

### CLI 部署

```bash
npx vercel --prod
```

## 部署到其他平台

### Cloudflare Pages

Cloudflare Pages 目前不支持 Next.js API Routes。需要以下改造：

1. 将 API Routes 迁移到 [Cloudflare Workers](https://workers.cloudflare.com/)
2. 使用 `@cloudflare/next-on-pages` 适配器
3. 配置 `wrangler.toml`

不推荐 V1 阶段使用 Cloudflare Pages。

### 自有服务器 (Node.js)

```bash
# 构建
pnpm build

# 使用 PM2 管理进程
npm install -g pm2
pm2 start node_modules/.bin/next --name premise-studio -- start -p 3000
pm2 save
pm2 startup

# 或使用 systemd
# 见下文 systemd 配置
```

### Docker

创建 `Dockerfile`：

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

构建与运行：

```bash
docker build -t premise-studio .
docker run -p 3000:3000 -e DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY premise-studio
```

### systemd 配置 (Linux 服务器)

```ini
# /etc/systemd/system/premise-studio.service
[Unit]
Description=Premise Studio
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/premise-studio
Environment=NODE_ENV=production
Environment=DEEPSEEK_API_KEY=sk-xxxxx
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now premise-studio
```

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name premise-studio.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

> 注意：`proxy_read_timeout` 至少设为 120 秒，因为 AI streaming 请求可能持续较长时间。

## 环境变量参考

| 变量名 | 必选 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | 否* | DeepSeek API 密钥 |
| `ANTHROPIC_API_KEY` | 否* | Anthropic API 密钥 |
| `OPENAI_API_KEY` | 否* | OpenAI API 密钥 |

> *至少配置一个。系统按 DeepSeek > Anthropic > OpenAI 优先级选择。

## 常见问题

### API Key 不生效

确保 `.env.local` 文件在项目根目录，格式为：

```
DEEPSEEK_API_KEY=sk-xxxxx
```

注意：值不需要加引号。

### AI 响应很慢

DeepSeek 默认超时 60 秒。如需调整，修改 `src/lib/env.ts` 中的 `AI_TIMEOUT_MS`。

### 端口被占用

```bash
pnpm dev -p 3001
```

或设置环境变量：

```bash
PORT=3001 pnpm dev
```

### 数据存储

- Session 和 Card Tree 数据存储在浏览器 localStorage
- 清除浏览器数据会导致数据丢失
- 建议定期使用 JSON 导出功能备份
