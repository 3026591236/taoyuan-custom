# THIRD-PARTY NOTICES / 第三方声明

本项目当前仍处于原创化改造阶段。以下清单用于工程履约和来源追踪，不替代各依赖随附的完整许可证。

## 原版作品

- 项目：`setube/taoyuan`（《桃源乡》）
- 来源：https://github.com/setube/taoyuan
- 许可：Creative Commons Attribution-NonCommercial 4.0 International
- 状态：当前发行版本仍包含衍生内容，须署名、注明修改并遵守非商业限制。

## 素材

- Kenney Roguelike / Dungeon 素材
  - 随附许可：`public/assets/kenney/**/License.txt`、`src/assets/kenney/**/LICENSE-*`
  - 许可：CC0 1.0
  - 处理：许可证文件必须随对应素材保留。
- zpix 字体
  - V3.1.4 起当前源码与新构建入口不再加载，源 WOFF2 已移除；历史哈希构建资源仅为旧页面兼容保留，不作为新版本字体依赖。
- AI 辅助及项目制作素材
  - 详见 `ASSET_LEDGER.md`，后续逐项补充模型、生成时间、源文件哈希和人工修改记录。

## 软件依赖许可类别

当前直接依赖主要包含 MIT、ISC、BSD-2-Clause、BSD-3-Clause 与 Apache-2.0 类许可证，例如 Vue、Pinia、Vue Router、Vite、Capacitor、Express、MySQL2、Lucide、Terser、bcryptjs 与 TypeScript 等。

正式对外发行 Web、Electron 或 Android 安装包前，应从实际锁定版本生成 SBOM 与完整许可证集合；本文件不应被视为完整的传递依赖清单。
