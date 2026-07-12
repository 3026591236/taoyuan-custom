# ASSET LEDGER / 资产台账

> 本台账用于记录《万象仙乡》当前素材来源、授权状态与替换计划。它配合 `CREDITS.md` 使用，不替代正式法律审查。

## 分类约定

- **原创新增**：本项目后续制作、生成或重绘的资产。
- **AI 辅助原创**：使用生图模型确定视觉方向或生成素材，再由项目落地、裁切或重绘。
- **第三方授权**：来自外部素材包/字体/图标库，需保留其许可证。
- **原版遗留/待替换**：来自原版《桃源乡》或命名/风格明显沿用原版，后续应替换或审计。

## 当前核心品牌素材

| 路径 | 分类 | 当前用途 | 授权/状态 | 后续处理 |
| --- | --- | --- | --- | --- |
| `src/assets/wanxiang-logo.svg` | AI 辅助原创 / 项目内 SVG 重绘 | 首页 Logo / 品牌徽记 | 使用生图模型确定“圆形仙门徽记、灵田、仙山、星图、金紫青色系”方向后，以 SVG 落地 | 后续如生图工具提供可落盘高清 PNG/WebP，可替换或作为 App 图标源图 |
| `src/assets/wanxiang-hero.svg` | AI 辅助原创 / 项目内 SVG 重绘 | 首页主视觉 | 使用生图模型确定“下界灵田村落 + 上界仙门 + 星河法阵 + 浮空山”方向后，以 SVG 落地 | 后续可替换为高清 16:9 主视觉图 |
| `src/assets/home-pixel-taoyuan.svg` | 原版遗留/待替换 | 历史首页像素图，当前首页已不再引用 | 文件名仍含 `taoyuan`，暂保留以免历史引用/回滚断裂 | 确认无引用后可迁移到 legacy 或移除 |
| `src/assets/logo.png` | 原版遗留/待替换 | 历史 Logo，当前首页已不再引用 | 待审计 | 后续替换 App icon/favicon 源图后可移除 |
| `public/favicon.ico` | 原创新增 / 程序生成 | 浏览器 favicon | 基于万象仙乡徽记用脚本生成 ICO | 已替换；源脚本见 `scripts/generate-wanxiang-icons.mjs` |
| `public/icons/wanxiang-icon-*.png`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` | 原创新增 / 程序生成 | PWA / 浏览器 / iOS 主屏图标 | 基于万象仙乡徽记用脚本生成 | 保留并随品牌升级迭代 |
| `android/app/src/main/res/mipmap-*/ic_launcher*.png` | 原创新增 / 程序生成 | Android App 图标 | 基于万象仙乡徽记用脚本生成 | 后续如接入高清 PNG，可重新生成 |

## 仙界与后续新增素材

| 路径 | 分类 | 当前用途 | 授权/状态 | 后续处理 |
| --- | --- | --- | --- | --- |
| `public/assets/immortal/immortal-sovereign.png` | AI 辅助原创 | 仙界角色/仙身视觉 | GPT Image 生成资产，作为本项目新增素材管理 | 保留生成来源记录；必要时补提示词/时间 |
| `public/assets/immortal/immortal-sovereign-anime.png` | AI 辅助原创 | 仙界角色/仙身视觉 | GPT Image 生成资产，作为本项目新增素材管理 | 保留生成来源记录；必要时补提示词/时间 |
| `public/assets/immortal/*.png` | 原创新增/待细审 | 仙界功能图标/界面素材 | 多数为后续定制阶段接入 | 逐项补齐来源与生成记录 |

## 第三方授权素材

| 路径 | 分类 | 当前用途 | 授权/状态 | 后续处理 |
| --- | --- | --- | --- | --- |
| `public/assets/kenney/**/License.txt` | 第三方授权 | 像素/地牢/角色等素材 | Kenney 许可证，需保留 | 若继续使用，保留署名与许可证；若原创化彻底替换，可移除 |
| `src/assets/kenney/roguelike-characters/**` | 第三方授权 | 角色像素资源 | Kenney 许可证，需保留 | 同上 |
| `src/assets/fonts/zpix.woff2` | 第三方授权 | 像素字体 | 需确认并补充许可证说明 | 确认授权或替换字体 |
| `lucide-vue-next` | 第三方开源依赖 | UI 图标 | ISC License | 保留 package 许可证即可 |

## 非游戏素材 / 敏感素材

| 路径 | 分类 | 当前用途 | 授权/状态 | 后续处理 |
| --- | --- | --- | --- | --- |
| `src/assets/alipay.png` | 非游戏素材 | 赞助/支付展示 | 需确认是否继续使用 | 若不需要赞助入口，建议后续移除 |
| `src/assets/wechat.png` | 非游戏素材 | 赞助/联系展示 | 需确认是否继续使用 | 若不需要赞助入口，建议后续移除 |

## 原创化替换优先级

1. 品牌素材：favicon、App icon、Logo、首页主视觉。
2. 玩家高频可见旧素材：地图/首页/按钮/教程图。
3. 第三方素材决策：Kenney 和 zpix 是保留署名还是替换为原创。
4. 原版遗留素材清零：确认无引用后移动到 `legacy` 或删除。
5. 发行前审计：确保 README / CREDITS / About / LICENSE 与实际素材一致。
