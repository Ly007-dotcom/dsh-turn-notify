# 插件索引使用与托管

本仓库根目录的 `market-index.json` 是一个符合 **DSH 插件市场索引格式 1** 的索引文件。
DSH 没有中央插件仓库：任何人把这份索引的 URL 加进自己的 DSH，就能在 **Plugins → Discover**
里看到并安装本插件。

## 别人如何接入

1. 打开 DSH 的 **插件** 页面，在 **Experimental plugins／实验性插件** 中启用 **Custom plugin indexes／自定义插件索引**，再切到 **Discover** 标签。
2. 添加索引 URL：把 `market-index.json` 的公开地址粘进去。
3. 搜索 `dsh-turn-notify`，检查版本和来源后安装，在 **Installed／已安装** 中确认启用。
4. 到 **设置 → 通用 → 完成通知** 检查开关、允许系统通知并发送测试通知。完整步骤及 FAQ 见 [中文指南](./README.zh-CN.md)。

也可以让 DSH 的 Agent 用 `plugin_market` 工具读这个索引。

## 如何托管这个索引

索引是一份静态 JSON，任何能返回 `application/json` 的 https 地址都可以。
以下三种最省事：

### GitHub Pages

把 `market-index.json` 放在一个公开仓库里，在仓库 **Settings → Pages** 启用 Pages，
源选择分支根目录。地址形如：

```
https://<你的用户名>.github.io/<仓库名>/market-index.json
```

如果索引放在本仓库根目录，且此仓库启用了 Pages，就是：

```
https://Ly007-dotcom.github.io/dsh-turn-notify/market-index.json
```

> 本仓库目前**未启用** Pages，上面这个地址还不能用。需要时在仓库
> **Settings → Pages** 里开启即可，无需改文件。
>
> 注意：DSH 拒绝跟随重定向，所以必须用**最终地址**，不能用会被跳转的短链。

### jsDelivr（推荐）

```
https://cdn.jsdelivr.net/gh/Ly007-dotcom/dsh-turn-notify@main/market-index.json
```

直接镜像 GitHub 仓库里的文件，无需任何配置，返回正确的 `application/json`。
国内网络通常比 raw 稳定，也可以锁定 commit 而不是 `@main`。

### GitHub raw

```
https://raw.githubusercontent.com/Ly007-dotcom/dsh-turn-notify/main/market-index.json
```

最省事，无需额外配置。但实测在部分网络环境下 `raw.githubusercontent.com`
**无法连接**，如果读者反馈索引加不上，优先换 jsDelivr。

### 任意静态托管

Cloudflare Pages、Netlify、Vercel、对象存储均可。只要 CORS 足够宽松、
不做重定向即可。

## 索引校验与发布

仓库已固定官方校验器为开发依赖，运行：

```bash
npm ci --ignore-scripts
npm run check:index
```

当前 1.0.1 仅供本地试用，索引继续保留已发布的 1.0.0。试用通过并提交最终源码后，在干净工作区执行：

```bash
npm run release:index -- <最终源码的40位完整SHA>
npm run verify
```

脚本验证提交与当前 HEAD、包版本一致，自动写入版本、实际准备时间和兼容范围，并保留历史条目。生成索引后需要另行提交和推送；完整流程见 [RELEASE.md](./RELEASE.md)。不要给 1.0.1 填入旧版源码 SHA，也不要发布带占位符的索引。

几处容易踩的坑：

- `commit` 必须是**完整 40 位小写十六进制**，短 SHA 会被拒绝。
- `source.url` 不要带 `.git` 后缀、查询串或锚点。
- `publishTimestamp` 必须是**整数** Unix 秒。
- `versions` 不能为空，校验器会自动按 SemVer 降序排列。
- `title` 必须包含 `en` 键，其他语言可选。

## 关于 npm

若日后把包发布到 npm，可以把 `source` 改成：

```json
{ "type": "npm", "registry": "https://registry.npmjs.org/" }
```

`registry` 可省略，表示使用安装方自己的默认源。相比之下，Git 源的优点是不需要
npm 账号；缺点是无法用 `dsh-turn-notify` 这个包名直接 `pnpm add`。
