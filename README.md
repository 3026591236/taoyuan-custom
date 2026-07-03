# 桃源乡 - 自主更新版

> 基于 [桃源乡](https://github.com/setube/taoyuan) 进行的自主功能扩展版本

## 🎮 在线地址

**http://38.12.5.26:8083/**

## ✨ 新增功能（相比原版）

### 📬 GM 邮件系统
- 后台可给**全体玩家**或**指定玩家**发送系统邮件
- 邮件可附带奖励：**铜钱、体力、物品**（支持品质选择）
- 玩家在游戏内地图菜单 → 随身 → **系统邮件** 中查看并领取
- 领取后自动写入当前存档，5 秒自动云存档同步

### ✅ 每日签到
- 地图菜单 → 随身 → **每日签到**
- 每天可领取 500 铜钱
- 后台可查看签到记录

### 📢 公告与更新记录
- 后台可编辑公告内容，设置自动弹出间隔
- 更新记录后台维护，前端弹窗展示
- 公告不会遮挡存档加载操作

### 💾 5 秒自动账号云存档
- 进入游戏后每 5 秒自动保存本地 + 云端
- 已登录账号时同步上传，避免下线忘记保存

### ⚙️ 后台管理
- Tab 栏布局：基础配置 / 关于赞助 / 更新记录 / 玩家管理 / GM邮件
- 关于游戏、赞助作者信息后台可配置（QQ群、GitHub、TapTap、二维码、爱发电）
- 玩家管理：封号/解封、重置密码、云存档查看

### 🧘 修仙体系 V0.1 - 灵田修行
- 地图菜单 → 随身 → **修行**
- 灵田启蒙 → 打坐调息 → 炼化灵气 → 尝试突破
- 收获高阶灵性作物获得灵气
- 境界、灵根、灵田等级、修为、灵力体系

### 🔥 修仙体系 V0.2 - 灵植与炼丹
- 新增灵植：蕴灵稻、凝露草、朱果
- 炼丹炉：花费 5000 文安置
- 丹药：回灵丹、聚气丹、筑基丹
- 法宝化：流光锄、引灵壶、灵雨诀

## 🛠 技术栈

- 前端：Vue 3 + TypeScript + Pinia + Tailwind CSS
- 后端：Node.js (server.js)
- 数据存储：JSON 文件 (db.json)
- 部署：Docker 容器

## 🚀 部署方式

### Docker 导入镜像
```bash
docker load < builds/taoyuan-custom-gm-mail.tar.gz
docker run -d --name taoyuan --restart unless-stopped -p 8083:80 -v /opt/taoyuan-data:/data local/taoyuan-custom:gm-mail
```

### 从源码构建
```bash
docker build -t local/taoyuan-custom:gm-mail .
docker run -d --name taoyuan --restart unless-stopped -p 8083:80 -v /opt/taoyuan-data:/data local/taoyuan-custom:gm-mail
```

## 📁 项目结构

```
├── server.js                          # 后端服务（新增邮件/签到/后台API）
├── Dockerfile                         # Docker 构建配置
├── src/
│   ├── views/
│   │   ├── AdminView.vue              # 后台管理页（新增）
│   │   ├── GameLayout.vue             # 游戏主布局（修改：邮件弹窗/自动存档）
│   │   ├── MainMenu.vue               # 首页（修改：后台配置读取）
│   │   └── game/
│   │       └── CultivationView.vue    # 修行页面（新增）
│   ├── components/game/
│   │   └── MobileMapMenu.vue          # 地图菜单（修改：签到/邮件入口）
│   ├── stores/
│   │   └── useCultivationStore.ts     # 修仙 Store（新增）
│   ├── data/
│   │   ├── crops.ts                   # 作物定义（修改：灵植）
│   │   └── items.ts                   # 物品定义（修改：炼丹产物）
│   └── ...
├── builds/                            # 构建产物
│   └── taoyuan-custom-gm-mail.tar.gz  # Docker 镜像
└── README.md
```

## 📝 更新日志

| 日期 | 版本 | 内容 |
|------|------|------|
| 2026-07-03 | gm-mail | 新增 GM 邮件系统、邮件入口移到地图菜单 |
| 2026-07-03 | cultivation-v02 | 修仙 V0.2：灵植与炼丹 |
| 2026-07-03 | admintabs | 后台管理改为 Tab 栏 |
| 2026-07-03 | autosave5s-about | 5秒自动存档 + 关于赞助后台配置 |
| 2026-07-03 | cultivation-v01 | 修仙 V0.1：灵田修行 |
| 2026-07-03 | noticechangelog3 | 公告/更新记录热修 |
| 2026-07-03 | checkinmap | 每日签到放入地图菜单 |

## 📄 致谢

- 原版项目：[setube/taoyuan](https://github.com/setube/taoyuan)
- 灵感来源：星露谷物语
