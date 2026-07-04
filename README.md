# 我从种田开始修仙

> 基于 [桃源乡](https://github.com/setube/taoyuan) 扩展的像素田园修仙游戏。当前版本把账号角色、数据库存档、种田到修仙的成长衔接、红尘历练和后台运营功能整合到同一套前后端部署中。

## 在线地址

- 游戏入口：`http://129.204.252.190:8084/`
- 前端通过 nginx 提供静态文件，`/api/` 反向代理到后端。

## 当前定位

《我从种田开始修仙》不是单纯把“农场”和“修仙”并排放在一起，而是强调：

1. 先从翻土、播种、浇水、收获开始经营田庄。
2. 作物收获逐步积累「地脉感应」。
3. 地脉感应达到 100 后启蒙灵田。
4. 普通作物开始转化少量灵气，灵植成为炼丹与突破材料。
5. 继续进入炼丹、突破、洞府、法宝、元神、转生、红尘历练和挑战凶兽。

## 主要功能

### 账号与角色

- 注册/登录账号。
- 数据库存储正式角色和进度。
- 每个账号最多 3 个角色。
- 角色名全服唯一。
- 首页显示账号角色列表，每个角色可直接「继续游戏」。
- 浏览器 localStorage 只作为运行缓存，不再作为玩家可见的正式存档概念。

### 种田经营

- 多季节作物、播种、浇水、收获、出货。
- 普通作物、高阶作物、灵植、温室、育种、品质、巨型作物等系统。
- 温室收获已接入修仙收益，能触发地脉感应或灵气获取。

### 从种田开始修仙

- 新增「地脉感应」过渡机制。
- 未启蒙前，收获作物积累地脉感应。
- 地脉感应满后，花费铜钱整理地脉并启蒙灵田。
- 启蒙后，普通作物给少量灵气，灵植给更多灵气并作为炼丹材料。
- 推荐路线：种田收获 -> 地脉感应 100 -> 启蒙灵田 -> 种灵植 -> 炼丹突破。

### 修仙系统

- 境界成长：凡人、炼气、筑基、金丹、元婴、化神、渡劫、大乘、真仙、玄仙等。
- 灵田、灵气、灵力、修为、突破失败与保底。
- 炼丹配方、药材、百草园、聚灵阵。
- 洞府、灵兽、本命法宝、符箓、元神。
- 农具法宝化：流光锄、引灵壶、灵雨诀。
- 转生/轮回：转生后解锁更长线玩法和增益。

### 战斗与中后期

- 红尘历练。
- 挑战凶兽。
- 秘境探索。
- 转生材料、凶兽材料、灵蕴、轮回丹等中后期资源闭环。
- 排行榜和突破全服公告。

### 运营后台

- 管理员后台。
- 配置公告和更新记录。
- 玩家管理、封号/解封、重置密码。
- GM 邮件和奖励领取。
- 每日签到。

## 架构

前后端分离部署：

- 前端：Vue 3 + Vite + Pinia，构建产物输出到 `docs/`。
- 后端：Express 5 + MySQL。
- 进程管理：pm2。
- Web 服务：nginx，监听 8084。
- API 代理：`/api/` -> `http://127.0.0.1:3001`。

```text
浏览器
  -> nginx:8084
      -> 静态文件：/opt/taoyuan-frontend
      -> /api/* -> Express:3001 -> MySQL
```

## 项目结构

```text
├── src/                    # 前端 Vue 源码
│   ├── views/              # 页面组件
│   ├── views/game/         # 游戏内功能页
│   ├── stores/             # Pinia 状态管理
│   ├── composables/        # 组合式函数
│   ├── components/         # 通用组件
│   ├── data/               # 作物、物品、任务等数据配置
│   └── assets/             # 前端资源，例如首页像素图
├── backend/                # 后端 Express 源码
│   ├── index.mjs           # 后端主文件和 API 路由
│   ├── package.json        # 后端依赖
│   └── schema.sql          # MySQL 建表语句
├── docs/                   # Vite 构建产物，随源码一起提交
├── install.sh              # 一键安装脚本
├── package.json            # 前端依赖和构建脚本
└── README.md
```

## 数据库

核心表：

| 表名 | 用途 |
|------|------|
| users | 用户账号 |
| sessions | 登录会话 |
| characters | 账号角色，角色名全服唯一 |
| saves | 角色进度，包含加密 raw 和明文 data_json |
| checkins | 签到记录 |
| mails | 系统邮件 |
| mail_claims | 邮件领取记录 |
| config | 公告、更新记录等配置 |
| leaderboard | 排行榜缓存/兼容表 |
| world_announcements | 世界公告 |
| breakthrough_log | 突破记录 |

存档设计：

- `saves.raw`：加密完整存档，用于继续游戏。
- `saves.data_json`：后端可读结构化数据，用于排行榜和统计。
- `saves.character_id`：绑定具体角色。
- `characters.name`：全服唯一角色名。

## 常用 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/me` | 当前用户信息 |
| GET | `/api/characters` | 当前账号角色列表 |
| POST | `/api/characters` | 创建角色 |
| GET | `/api/check-char-name` | 检查角色名唯一性 |
| GET/PUT | `/api/saves/:slot` | 读取/写入角色存档 |
| GET | `/api/leaderboard` | 排行榜 |
| GET | `/api/config` | 前台配置和更新记录 |
| POST | `/api/breakthrough-announce` | 突破公告 |
| GET | `/api/world-announcements` | 世界公告 |
| GET/POST | `/api/checkin` | 签到 |
| GET | `/api/mails` | 邮件列表 |
| POST | `/api/mails/:id/claim` | 领取邮件 |
| GET | `/api/admin/overview` | 后台总览 |
| GET | `/api/admin/users` | 用户列表 |
| POST | `/api/admin/mails` | 发送 GM 邮件 |
| GET/POST | `/api/admin/config` | 后台配置 |

## 手动部署

### 1. 安装依赖

```bash
cd /opt/taoyuan-src
npm install

cd /opt/taoyuan-src/backend
npm install
```

### 2. 构建前端

```bash
cd /opt/taoyuan-src
npm run build
```

构建输出目录是 `docs/`。

### 3. 部署前端

```bash
sudo rm -rf /opt/taoyuan-frontend/*
sudo cp -a /opt/taoyuan-src/docs/. /opt/taoyuan-frontend/
sudo chown -R www-data:www-data /opt/taoyuan-frontend
```

### 4. 部署后端

```bash
sudo cp /opt/taoyuan-src/backend/index.mjs /opt/taoyuan-backend/index.mjs
pm2 restart taoyuan-api
```

### 5. nginx 示例

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

## 更新流程

每次更新必须执行完整流程：

1. 修改前备份源码、部署目录和数据库。
2. 修改源码。
3. 更新新手教程/玩法说明。
4. 写入游戏内「更新记录」。
5. 执行 `npm run build`。
6. 部署 `docs/` 到 `/opt/taoyuan-frontend`。
7. 必要时同步并重启后端。
8. 验证首页、关键 API、构建产物关键字。
9. 提交并推送 GitHub。

GitHub 推送要求：

- 源码必须提交。
- `docs/` 构建产物必须提交。
- README、后端、前端、构建产物保持一致。
- 当前仓库：`https://github.com/3026591236/taoyuan-custom.git`

## 开发注意

- 不要把浏览器 localStorage 当正式存档；正式数据以 MySQL 为准。
- 继续游戏必须读取 `saves.raw`，排行榜和统计读取 `saves.data_json`。
- 旧的 `src/**/*.js` 缓存文件可能干扰 Vite/TypeScript，当前已清理，源码以 `.ts/.vue` 为准。
- 每次玩法更新都要同步新手教程和更新记录。
- 构建时 `useGameStore` 仍有较大 chunk 警告，后续如果继续优化卡顿，可进一步拆分 store 或 manual chunks。
