# 万象仙乡（原创化过渡版）

> **版权与原创化状态说明**
>
> 当前项目正在从原版《桃源乡》深度定制版本逐步改造为《万象仙乡》原创化版本，在完成去原版化审计和替换前，继续遵守原版 CC BY-NC 4.0（署名-非商业性使用）许可。
>
> 本仓库已新增：
>
> - `CREDITS.md`：记录原版来源、第三方资源、后续新增内容与许可状态
> - `DEORIGINALIZATION_PLAN.md`：记录将项目逐步改造为原创游戏的执行清单
>
> 在完成品牌、文案、素材、核心代码结构和第三方资源审计替换前，不建议移除原版署名或宣称商业可用。


《万象仙乡》是一个以“万象经营 → 生活社交 → 修仙成长 → 仙界长线追求”为核心循环的 Web 修仙经营游戏。当前仓库包含前端源码、后端 API、GitHub Pages/静态构建产物 `docs/`，可本地运行，也可部署到 Linux 服务器。

- 线上示例：<https://taoyuan.9l1.cn/>
- 后端默认端口：`3001`
- 前端构建目录：`docs/`
- 推荐部署目录：
  - 源码：`/opt/taoyuan-src`
  - 前端：`/opt/taoyuan-frontend`
  - 后端：`/opt/taoyuan-backend`

## 功能概览

- 种田、牧场、鱼塘、加工、烹饪、采矿、钓鱼、竹林采集
- NPC、结婚、子女、家族传承、每日委托
- 修行、灵田、洞府、炼丹、制符、法宝、元神、转生
- 红尘历练、挑战凶兽、秘境探索、登仙塔赛季挑战
- 宗门、公会、瀚海商路、拍卖/商圈、排行榜
- 活动中心、周/月修行令、闭关归来、全服镇魔、博物馆名望
- 后台管理：配置、公告、用户、邮件等

## 环境要求

推荐：

- Ubuntu 22.04/24.04 或 Debian 12
- Node.js 22+
- npm 10+
- MySQL 8 / MariaDB 10.6+
- Nginx
- PM2
- 2GB+ 内存（构建时建议有 swap）

## 一键安装（推荐）

脚本位于：`scripts/install.sh`

### 默认安装

```bash
git clone https://github.com/3026591236/taoyuan-custom.git /opt/taoyuan-src
cd /opt/taoyuan-src
sudo bash scripts/install.sh
```

默认会：

- 安装系统依赖、Node.js、PM2、Nginx、MySQL
- 安装前后端 npm 依赖
- 创建数据库和数据库账号
- 构建前端到 `docs/`
- 同步前端到 `/opt/taoyuan-frontend`
- 同步后端到 `/opt/taoyuan-backend`
- 使用 PM2 启动 `taoyuan-api`

如果没有传入 `DB_PASSWORD`，脚本会自动生成数据库密码，并只在安装时显示一次。

### 指定域名、目录和数据库密码

```bash
DOMAIN=game.example.com \
DB_PASSWORD='请换成强密码' \
APP_DIR=/opt/taoyuan-src \
WEB_DIR=/opt/taoyuan-frontend \
API_DIR=/opt/taoyuan-backend \
WRITE_NGINX=1 \
sudo -E bash scripts/install.sh
```

常用环境变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `APP_DIR` | `/opt/taoyuan-src` | 源码目录 |
| `WEB_DIR` | `/opt/taoyuan-frontend` | 前端部署目录 |
| `API_DIR` | `/opt/taoyuan-backend` | 后端部署目录 |
| `DB_NAME` | `taoyuan` | 数据库名 |
| `DB_USER` | `taoyuan` | 数据库用户 |
| `DB_PASSWORD` | 自动生成 | 数据库密码 |
| `API_PORT` | `3001` | 后端端口 |
| `PM2_NAME` | `taoyuan-api` | PM2 进程名 |
| `DOMAIN` | `_` | Nginx server_name |
| `WRITE_NGINX` | `0` | 是否自动写入 Nginx 配置 |

> 注意：脚本不会写死 GitHub Token，也不会保存任何私密凭据到仓库。

## 手动安装

### 1. 获取源码

```bash
git clone https://github.com/3026591236/taoyuan-custom.git /opt/taoyuan-src
cd /opt/taoyuan-src
```

### 2. 安装依赖

```bash
npm install
cd backend
npm install
cd ..
```

### 3. 初始化数据库

```sql
CREATE DATABASE IF NOT EXISTS taoyuan DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'taoyuan'@'localhost' IDENTIFIED BY '请换成强密码';
GRANT ALL PRIVILEGES ON taoyuan.* TO 'taoyuan'@'localhost';
FLUSH PRIVILEGES;
```

后端启动时会自动创建/补齐所需表结构。核心表包括：

- `users`
- `characters`
- `saves`
- `config`
- `world_announcements`
- `mails`
- `checkins`
- `breakthrough_log`

### 4. 构建前端

```bash
cd /opt/taoyuan-src
npm run build
```

输出目录：`docs/`

### 5. 部署前端

```bash
sudo mkdir -p /opt/taoyuan-frontend/downloads
sudo rsync -a --delete --exclude downloads /opt/taoyuan-src/docs/ /opt/taoyuan-frontend/
```

`downloads/` 通常存放客户端安装包，更新前端时建议保留。

### 6. 部署后端

```bash
sudo mkdir -p /opt/taoyuan-backend
sudo cp /opt/taoyuan-src/backend/index.mjs /opt/taoyuan-backend/index.mjs
sudo cp /opt/taoyuan-src/backend/package.json /opt/taoyuan-backend/package.json
cd /opt/taoyuan-backend
npm install --omit=dev
```

可选 `.env`：

```bash
cat > /opt/taoyuan-backend/.env <<'EOF'
TAOYUAN_DB_HOST=localhost
TAOYUAN_DB_NAME=taoyuan
TAOYUAN_DB_USER=taoyuan
TAOYUAN_DB_PASSWORD=请换成强密码
PORT=3001
EOF
chmod 600 /opt/taoyuan-backend/.env
```

### 7. 使用 PM2 启动后端

```bash
cd /opt/taoyuan-backend
pm2 start index.mjs --name taoyuan-api --update-env
pm2 save
pm2 status
```

检查：

```bash
curl http://127.0.0.1:3001/api/config
```

### 8. Nginx 配置示例

```nginx
server {
    listen 80;
    server_name game.example.com;
    root /opt/taoyuan-frontend;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Authorization $http_authorization;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control no-cache;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|webp|woff2|ico)$ {
        expires 30d;
        add_header Cache-Control public;
    }
}
```

启用：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

HTTPS 可使用 certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d game.example.com
```

## 本地开发

前端开发：

```bash
npm install
npm run dev
```

后端开发：

```bash
cd backend
npm install
node index.mjs
```

生产构建：

```bash
npm run build
```

类型检查：

```bash
npx vue-tsc -b --noEmit
node --check backend/index.mjs
```

## 更新已有服务器

推荐流程：

```bash
cd /opt/taoyuan-src
git pull --ff-only
npm install
npm run build
rsync -a --delete --exclude downloads docs/ /opt/taoyuan-frontend/
cp backend/index.mjs /opt/taoyuan-backend/index.mjs
cd /opt/taoyuan-backend
npm install --omit=dev
pm2 restart taoyuan-api --update-env
```

验证：

```bash
curl -I https://你的域名/
curl https://你的域名/api/config
pm2 status
```

## 备份建议

更新前建议备份：

```bash
TS=$(date +%Y%m%d-%H%M%S)
B=/home/ubuntu/taoyuan-backups/before-$TS
mkdir -p "$B"
rsync -a /opt/taoyuan-src/ "$B/src/"
rsync -a /opt/taoyuan-backend/ "$B/backend/"
rsync -a /opt/taoyuan-frontend/ "$B/frontend/"
mysqldump -u taoyuan -p --single-transaction --default-character-set=utf8mb4 taoyuan > "$B/taoyuan.sql"
```

## 常见问题

### 1. `npm run build` 内存不够

增加 swap 或换更高内存服务器。2GB 内存机器建议配置 swap。

### 2. `/api/config` 访问失败

检查：

```bash
pm2 logs taoyuan-api
pm2 status
curl http://127.0.0.1:3001/api/config
```

### 3. 前端刷新 404

Nginx 需要：

```nginx
try_files $uri $uri/ /index.html;
```

### 4. 更新后下载包不见了

部署前端时要保留 `downloads/`：

```bash
rsync -a --delete --exclude downloads docs/ /opt/taoyuan-frontend/
```

### 5. 数据库乱码

数据库、表和连接都应使用 `utf8mb4`。更新 `config.updateLogs` 时建议用参数化 SQL，不要手拼 SQL 字符串。

## 开发与提交约定

- 源码和 `docs/` 构建产物都提交到 GitHub。
- 每次版本更新必须写游戏内 `updateLogs`。
- 后续版本默认不再强制补 `TutorialView.vue`，除非特别需要。
- 不要提交数据库密码、GitHub Token、服务器密码等敏感信息。
- 部署前先跑：

```bash
node --check backend/index.mjs
npx vue-tsc -b --noEmit
npm run build
```

## License

本仓库为自用游戏项目，请按仓库实际授权和素材来源要求使用。
