# 校园设备管理平台（School Equipment Manager）

面向学校设备中心的管理系统，三个核心模块：

| 模块 | 功能 |
| --- | --- |
| 设备管理 | 设备台账（名称 / 分类 / 总数 / 在用 / 借出 / 剩余），**CSV 批量导入**（拖拽上传、列名自动识别、预览与去重策略），手动增删改查，库存告急提示 |
| 学生借用登记 | 学生提交借用申请（姓名 / 班级 / 设备 / 数量 / 用途）→ 负责人**批准 / 拒绝** → **登记归还**；审批通过自动扣减库存、归还自动恢复 |
| 3D 打印服务 | 学生申请打印（需求描述 / 材料 / 数量 / 联系方式），负责人流转工单：**待接单 → 打印中 → 待交付 → 已交付**，记录学生信息与各节点时间 |
| 管理员登录 | 仅限管理员使用，密码以 PBKDF2-SHA256 哈希校验，登录后签发 7 天有效期的 HttpOnly 会话 |

技术栈：Next.js 16（App Router）· TypeScript · Tailwind CSS v4 · lucide-react

---

## 一、本地运行

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

> 当前数据层为**本地 JSON 文件存储**（`.data/db.json`），初始为空台账，
> 通过「添加设备」或「导入 CSV」即可建立数据。
> 页面与 API 均已就绪，接入数据库时只需替换 `lib/store.ts` 内部实现。

常用脚本：

```bash
npm run dev      # 开发
npm run build    # 构建检查
npm start        # 生产模式
```

---

## 管理员登录

平台仅限管理员使用，未登录访问任何页面或 API 都会被拦截到登录页（`/login`）。

- 密码以 **PBKDF2-SHA256 哈希**形式存于 `lib/auth.ts`（`PASSWORD_HASH`），明文不出现在代码中；
- 校验通过后签发 HMAC 签名的 HttpOnly Cookie 会话，有效期 7 天；
- 更换密码：用以下命令重新计算哈希，替换 `lib/auth.ts` 中的 `PASSWORD_HASH` 即可：
  ```bash
  node -e 'console.log(require("crypto").pbkdf2Sync("新密码", "2046cee3a35d8ca94e526ccd82ac0a46", 100000, 32, "sha256").toString("hex"))'
  ```

---

## 二、部署到 Vercel

1. 把本项目推到 GitHub（本项目已初始化 git，注意 `.data/` 已被 gitignore）：
   ```bash
   git add . && git commit -m "init: 校园设备管理系统"
   ```
2. 打开 [vercel.com/new](https://vercel.com/new)，导入仓库，Framework 选 **Next.js**，其余默认。
3. 点击 Deploy。构建完成后即可访问线上地址。

> 注意：Vercel 的无服务器环境**文件系统不可持久化**，本地数据每次部署会重置，
> 因此正式使用前必须完成第三步（接入数据库）。

---

## 三、接入 Vercel 数据库（Postgres）—— 第二步改造点

界面完成后，把数据持久化到 Vercel Postgres（Neon 托管）：

1. 在 Vercel 项目 → Storage 中创建 **Postgres** 数据库；
2. 在项目 → Settings → Environment Variables 中确认存在 `POSTGRES_URL`（Vercel 会自动注入）；
3. 本地初始化表结构（表结构已备好，见 `db/init.sql`）：
   ```bash
   psql "$POSTGRES_URL" -f db/init.sql
   ```
4. 改造 `lib/store.ts`：把其中的 CRUD 函数改为用 `@vercel/postgres` 的 `sql` 标签查询
   （函数签名与调用方保持不变，页面与 API 无需改动）：
   ```bash
   npm i @vercel/postgres
   ```
   表名：`equipment` / `borrows` / `print_orders`，字段与现有类型一一对应，见 `db/init.sql`。

如需要，可以让我在数据库创建好后直接完成第 4 步的代码切换。

---

## 目录结构

```
app/                页面与 API 路由（Route Handlers）
  page.tsx          首页（重定向至设备管理）
  login/            管理员登录页
  equipment/        设备管理（+ CSV 导入向导）
  borrows/          借用登记（审批 / 归还）
  prints/           3D 打印服务
  api/              /api/equipment|borrows|prints|stats|auth
proxy.ts            登录拦截（未登录重定向至 /login）
components/         通用 UI（弹窗 / 徽标 / Toast 等）
lib/
  types.ts          类型与状态机定义（前后端共用）
  store.ts          数据层（本地 JSON，接入数据库时替换）
  auth.ts           密码哈希校验 + 会话签名
  csv.ts            CSV 解析 / 列映射 / 模板
  api.ts            客户端请求封装
db/init.sql        Vercel Postgres 表结构
```
