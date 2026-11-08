# 纸间 · Shikishi Collection

一个开源、自托管的画师与色纸亲签收藏管理工具。当前是**单用户免登录版**：没有 ChatGPT 登录、账号、注册或管理口令。克隆仓库即可自行部署，用户系统留待后续版本。

## 快速启动

安装 Docker 与 Docker Compose 后：

```sh
git clone https://github.com/Da1suKE66/ShikishiCollection.git
cd ShikishiCollection
docker compose up -d --build
```

打开 <http://localhost:3000>。新资料库为空，可以先收录画师，也可以在「来源与设置」导入备份。

默认端口只绑定本机，数据保存在持久化卷 `shikishi-data`。这是一个没有访问认证的单用户应用：如果要放到其他人能访问的网络，应由部署者用网络或反向代理限制访问范围。

## 不使用 Docker

需要 Node.js 24 或更高版本：

```sh
npm ci
npm run build
npm start
```

默认打开 <http://127.0.0.1:3000>，数据保存在项目的 `data/` 目录。无需 OpenAI、ChatGPT、Cloudflare 或其他账号，也不需要外部数据库。

开发模式：

```sh
npm ci
npm run dev
```

前端在 <http://127.0.0.1:5173>，开发 API 在 `127.0.0.1:3001`。前端会自动代理 API 请求。

## 功能

- 画师档案：代表作、别名、社团、分类、标签、平台链接与笔记。
- 收藏管理：照片、手绘或签名形式、价格币种、持有状态、来源和入手渠道。
- FANBOX 特典：招募月份、档位、支援起始日、所需月数与参考满月日期。
- 展会手帐：关联画师、摊位、签名时间、公告来源；缺少年份的日期不自动进入日历。
- 动态收件箱：公开来源检查、基线比较、重复链接去重与已读状态。
- JSON 导入、导出与原始笔记保留。
- 桌面侧栏与手机底部导航；手机特典卡片、可滚动编辑窗口、横屏与 iPhone 安全区适配。

## 数据与备份

数据全部归部署者管理：

```text
data/
├── collection.sqlite       # SQLite 资料库
├── collection.sqlite-wal   # 运行时可能存在
├── collection.sqlite-shm   # 运行时可能存在
└── photos/                 # 上传照片及其类型信息
```

源码仓库不包含任何人的私人收藏、消费金额、原始清单或照片。旧版导出的 JSON 可以导入本项目，但 JSON 只保存照片链接，不包含原图；迁移时需另外保留照片并重新上传。

完整备份时，先停止应用，再复制整个数据目录或导出 Docker 卷。不要只复制正在写入的单个 SQLite 文件。

Docker 卷备份示例：

```sh
docker compose stop
docker compose run --rm --no-deps --user root --entrypoint tar shikishi -C /app/data -czf - . > shikishi-backup.tar.gz
docker compose start
```

JSON 导入只恢复画师、收藏、特典、展会与原始笔记；动态历史不会随导入还原，照片原图也不在 JSON 中。完整备份应使用数据目录或 Docker 卷。

## 配置

本地 Node 部署可复制 `.env.example` 为 `.env`。所有设置都可选：

| 配置 | 默认值 | 用途 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Node 服务监听地址 |
| `PORT` | `3000` | 服务端口 |
| `DATA_DIR` | `./data` | SQLite 与照片目录 |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,[::1]` | 允许访问的主机名，逗号分隔 |
| `APP_ORIGIN` | 未设置 | 使用 HTTPS 反向代理时的完整网站来源，例如 `https://collection.example.com` |
| `X_API_BEARER_TOKEN` | 未设置 | 可选的官方 X API 凭据 |

Docker 容器内监听 `0.0.0.0:3000`，Compose 将其映射到宿主机的 `127.0.0.1:3000`。如使用 HTTPS 域名，应同时设置 `APP_ORIGIN` 和 `ALLOWED_HOSTS`，并由反向代理保留 `Host`。

## 信息检查的范围

当前只支持手动检查，**没有后台定时任务或实时推送**。

- BOOTH：比较店铺当前公开页面的商品链接，不保证覆盖分页、库存和购买资格。
- FANBOX：尝试读取公开投稿链接，不读取付费、仅登录可见的内容或支援资格。
- X：只有配置 `X_API_BEARER_TOKEN` 后才使用官方 API；费用以 [X 官方计费说明](https://docs.x.com/x-api/getting-started/pricing) 为准。
- 首次成功读取只建立基线，之后的新发现才进入收件箱。
- 403、登录墙、脚本载入页面、超时与空解析会显示为读取受限，保留旧基线。
- 参展、签名和上新关键词仅生成待核对线索，需要打开原文确认。

## 检查与构建

```sh
npm run typecheck
npm test
npm run build
npm run test:integration
```

集成测试使用临时目录和本机随机端口，不读写部署实例的收藏。

浏览器适配回归测试（先构建）：

```sh
npx playwright install --with-deps chromium webkit
npm run test:responsive
```

测试覆盖 1280 / 1440 / 1920 宽桌面、768 宽平板，以及 iPhone 15 Pro Max 的 Safari 可见区域（430 × 739）、全屏（430 × 932）和横屏（932 × 350）。包含七个页面的宽度、搜索、长表单保存、日历、手机导航焦点与关闭、安全区和缩短可见区域的操作验证。浏览器测试使用临时资料库与虚构资料；截图与失败追踪写入被 Git 忽略的 `.publication/`。WebKit 设备模拟不能替代真机 Safari 的软键盘与地址栏交互验收。

## 目录

```text
app/            React 页面与编辑表单
lib/            数据模型、来源解析与检查逻辑
server/         Node HTTP API、SQLite 与照片存储
tests/          单元测试及独立部署集成测试
```

后续方向：更完善的来源适配、可选定时任务、用户和权限系统。

## 许可证

MIT。项目中的装饰图形不是画师作品；用户上传作品的权利归其原权利人。
