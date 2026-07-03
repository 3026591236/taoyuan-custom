# 桃源乡 - 自主更新版

> 基于 [桃源乡](https://github.com/setube/taoyuan) 进行的自主功能扩展版本

## 🚀 一键安装

在全新服务器上只需一条命令，自动安装所有环境、配置数据库、构建前端、启动后端：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/3026591236/taoyuan-custom/main/install.sh)
```

或者手动下载运行：

```bash
git clone https://github.com/3026591236/taoyuan-custom.git
cd taoyuan-custom
bash install.sh
```

脚本会交互式引导你配置：安装目录、端口、MySQL、管理员账号。安装完成即可访问游戏。

## 🎮 在线地址

**http://38.12.5.26:8084/**

## 🏗️ 架构

前后端分离部署：

- **前端**：Vue 3 + Vite 构建静态文件，nginx 托管（端口 8084）
- **后端**：Express 5 + MySQL，pm2 管理（端口 3001）
- **nginx 反向代理**：`/api/` 请求转发到后端

```
浏览器 → nginx:8084 → 静态文件
                    → /api/* → Express:3001 → MySQL
```

## 📦 项目结构

```
├── src/                    # 前端 Vue 源码
│   ├── views/             # 页面组件
│   ├── stores/            # Pinia 状态管理
│   ├── composables/       # 组合式函数
│   ├── components/        # 通用组件
│   └── data/              # 游戏数据配置
├── backend/               # 后端 Express 源码
│   ├── index.mjs          # 后端主文件（所有 API 路由）
│   ├── package.json       # 后端依赖
│   └── schema.sql         # MySQL 完整建表语句
├── docs/                  # 前端构建产物（部署到 nginx 目录）
├── install.sh             # 一键安装脚本
└── server.js              # 旧版 Docker 内嵌服务端（已弃用）
```

## 🛠️ 手动部署

<details>
<summary>点击展开手动部署步骤</summary>

### 环境要求

- Node.js 18+
- MySQL 5.7+ / MariaDB 10.3+
- nginx
- pm2（进程管理）

### 1. 安装依赖

```bash
# 前端
cd /opt/taoyuan-src && npm install

# 后端
cd /opt/taoyuan-src/backend && npm install
```

### 2. 初始化数据库

```bash
mysql -u root -p < backend/schema.sql

mysql -u root -p -e "
CREATE USER 'taoyuan'@'localhost' IDENTIFIED BY 'taoyuan2026';
GRANT ALL PRIVILEGES ON taoyuan.* TO 'taoyuan'@'localhost';
FLUSH PRIVILEGES;
"
```

### 3. 构建前端

```bash
npx vite build
mkdir -p /opt/taoyuan-frontend
cp -r docs/* /opt/taoyuan-frontend/
```

### 4. 配置 nginx

```nginx
server {
    listen 8084;
    server_name _;
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

    location ~* \.(js|css|png|jpg|jpeg|svg|woff2|ico)$ {
        expires 30d;
        add_header Cache-Control public;
    }
}
```

### 5. 启动后端

```bash
cd /opt/taoyuan-src/backend
pm2 start index.mjs --name taoyuan-api
pm2 save
pm2 startup
```

### 6. 创建管理员

第一个注册的用户自动成为管理员，或在数据库设置：

```bash
mysql -u taoyuan -ptaoyuan2026 taoyuan -e "UPDATE users SET role='admin' WHERE username='你的用户名';"
```

</details>

## 🔄 更新流程

```bash
cd /opt/taoyuan-src
git pull origin main
npm install
npx vite build
cp -r docs/* /opt/taoyuan-frontend/
cp backend/index.mjs /opt/taoyuan-backend/
cd /opt/taoyuan-backend && npm install && pm2 restart taoyuan-api
```

## ✨ 新增功能（相比原版）

- 💾 **账号系统 & 云存档** — 注册/登录，多存档槽位，跨设备同步
- 📬 **GM 邮件系统** — 后台发送系统邮件+奖励，游戏内领取
- ✅ **每日签到** — 每天领取 500 铜钱
- 📢 **公告与更新记录** — 后台编辑，前端弹窗展示
- 🧘 **修仙 V0.1-V0.2** — 灵田修行、灵植炼丹、法宝化
- 🏠 **V0.3 洞府与灵兽** — 洞府扩建、灵兽收服加成
- 🏆 **V0.4 排行榜 & 突破公告** — 修为/铜钱/灵气排行，突破全服通知
- ⚔️ **V0.5 秘境+炼器+门派+法宝** — 3大秘境、炼器8配方、3门派、6法宝槽
- ⚙️ **后台管理** — 基础配置/玩家管理/GM邮件/封号解封

## 📊 数据库表

| 表名 | 用途 |
|------|------|
| users | 用户账号 |
| sessions | 登录会话 |
| saves | 云存档（加密） |
| checkins | 签到记录 |
| mails | 系统邮件 |
| mail_claims | 邮件领取记录 |
| config | 后台配置（key-value） |
| world_announcements | 世界公告 |
| leaderboard | 排行榜快照 |
| breakthrough_log | 突破记录 |

## 📡 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| GET | /api/me | 当前用户信息 |
| GET/PUT | /api/saves/:slot | 云存档读写 |
| GET/POST | /api/checkin | 签到 |
| GET | /api/mails | 邮件列表 |
| POST | /api/mails/:id/claim | 领取邮件 |
| GET | /api/leaderboard | 排行榜 |
| GET | /api/config | 前台配置 |
| GET | /api/admin/overview | 后台总览 |
| GET | /api/admin/users | 用户列表 |
| POST | /api/admin/users/:id/ban | 封号 |
| POST | /api/admin/users/:id/unban | 解封 |
| POST | /api/admin/users/:id/reset-password | 重置密码 |
| GET/POST | /api/admin/config | 后台配置 |
| POST | /api/admin/mails | 发送GM邮件 |
| POST | /api/breakthrough-announce | 突破公告 |
| GET | /api/world-announcements | 世界公告 |

## 📝 开发注意

- 所有数据存 MySQL，不再用 db.json
- 前端构建产物在 `docs/` 目录
- 后端主文件是 `backend/index.mjs`
- 每次更新后需：① 构建前端 ② 复制到 nginx 目录 ③ 重启后端 ④ 推送 GitHub
- 旧版 Docker 部署（端口 8083）仍可运行，新架构在端口 8084
