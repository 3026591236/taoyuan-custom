# 桃源乡 uni-app 客户端壳

目标：Android/iOS 客户端启动后必须连接后端，下载当前 H5 资源包到客户端本地，再用本地 WebView 加载游戏。客户端不直接跳公网 H5，也不支持离线跳过更新进入。

## 后端接口

- `GET http://129.204.252.190:3001/api/client/manifest`
  - 返回当前客户端资源包版本、build、zip 地址、sha256、size。
- `GET http://129.204.252.190:3001/api/client/web.zip`
  - 返回当前 `docs/` 构建产物压缩包。

资源包生成：

```bash
cd /opt/taoyuan-src
npm run build
scripts/build-client-bundle.sh
```

部署时需要同步：

```bash
sudo rsync -a --delete client-dist/ /opt/client-dist/
pm2 restart taoyuan-api --update-env
```

## 客户端启动流程

1. 请求 `/api/client/manifest`。
2. 对比本地 `_doc/taoyuan-web/manifest.json`。
3. 不一致则下载 `/api/client/web.zip` 到 `_doc/taoyuan-web.zip`。
4. 解压到 `_doc/taoyuan-web/`。
5. 使用 `<web-view>` 加载 `_doc/taoyuan-web/index.html` 的本地 URL。
6. 任一步失败则停在加载页并显示“重新连接”，不进入游戏。

## uni-app 云打包

用 HBuilderX 打开 `uni-client/`：

- Android：发行 → 原生 App-云打包 → Android
- iOS：发行 → 原生 App-云打包 → iOS

iOS 云打包需要 Apple 证书/描述文件；不需要本地 Mac 编译。

## 修改服务器地址

入口文件：`pages/index/index.vue`

```ts
const SERVER_BASE = http://129.204.252.190:3001
```

如果后续配置 HTTPS，建议改为 HTTPS 地址。
