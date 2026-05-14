# 情侣纪念网站

## 项目概述
公开的多用户情侣纪念网站，使用 React 19 + Vite 8 构建，Supabase 云端存储 + Auth 认证。

## 启动方式
```bash
cd "couple-site"
npm install --cache /tmp/npm-cache   # 如果 npm install 报权限错误
npm run dev                           # 开发模式启动
npm run build                         # 生产构建
```

## 技术栈
- React 19 + Vite 8
- react-router-dom v7（客户端路由）
- Supabase Auth（邮箱/密码认证，JWT + RLS）
- Supabase Database（account_data 表，按 user_id 隔离）
- Supabase Storage（photo2 桶，照片云端存储）
- localStorage 缓存 + sessionStorage 认证状态
- 纯 CSS 样式（CSS 自定义属性动态主题）

## 路由结构
| URL | 页面 | 组件 |
|-----|------|------|
| /login | 登录/注册/邀请码 | Login.jsx |
| / | 首页（恋爱计时器） | Hero.jsx |
| /gallery | 照片（相册卡片 + 详情） | Gallery.jsx |
| /story | 故事（时间线） | Timeline.jsx |
| /countdown | 纪念日倒计时 | Countdown.jsx |
| /admin | 管理面板 | Admin.jsx |

## 数据架构
- `src/data/config.js` — 默认数据
- `src/data/supabase.js` — Supabase 客户端 + Auth + CRUD + 文件上传 + 邀请码 + 共享账户
- `src/data/store.js` — 数据管理层，localStorage 缓存 + Supabase 云端同步
  - `getData(key)` / `saveData(key, data)` — 按 `couple_{userId}_{key}` 存储
  - `getEffectiveUserId()` — 返回 activeDataOwner（共享模式）或 currentUserId
  - `setActiveDataOwner(id)` — 切换到共享账户数据
  - `isViewingSharedData()` — 是否正在查看共享账户
  - `syncToCloud()` / `syncFromCloud()` — 云端同步
  - `joinSharedAccount(code)` / `leaveSharedAccount(ownerId)` — 共享账户管理
- `src/utils/helpers.js` — 工具函数（readFileAsBase64, createThumbnail, generateThemeFromColor）

## 关键功能
- 邮箱注册/登录（Supabase Auth），支持会话持久化
- 邀请码共享：生成8位邀请码 → 对方输入后成为共享成员 → 共同维护数据
- 共享账户：成员可查看/编辑/上传到所有者账户，受 RLS 保护
- 照片云端存储（Supabase Storage），base64 本地回退
- 数据导出/导入（JSON 备份）
- 9 种预设主题 + 自定义颜色主题
- 旧 localStorage 账户自动检测并提供迁移

## 文件结构
```
couple-site/
├── src/
│   ├── App.jsx              # 路由入口 + ProtectedRoute
│   ├── App.css              # 全局样式 + nav + footer
│   ├── main.jsx             # React 入口
│   ├── data/
│   │   ├── config.js        # 默认配置数据
│   │   ├── store.js         # 数据存取层（localStorage + 云端同步）
│   │   └── supabase.js      # Supabase 客户端（Auth + DB + Storage）
│   ├── utils/
│   │   └── helpers.js       # 工具函数
│   └── components/
│       ├── Layout.jsx       # 共享布局（nav + footer + hearts + 共享模式提示）
│       ├── Layout.css
│       ├── Login.jsx        # 登录/注册/邀请码/旧账户迁移
│       ├── Login.css
│       ├── Hero.jsx         # 首页恋爱计时器
│       ├── Hero.css
│       ├── Hearts.jsx       # 浮动爱心背景
│       ├── Hearts.css
│       ├── Gallery.jsx      # 照片相册
│       ├── Gallery.css
│       ├── Timeline.jsx     # 故事时间线
│       ├── Timeline.css
│       ├── Countdown.jsx    # 纪念日倒计时
│       ├── Countdown.css
│       ├── Admin.jsx        # 管理面板（内容编辑 + 主题 + 同步 + 邀请码 + 共享成员）
│       └── Admin.css
├── supabase-schema.sql      # 数据库 schema + RLS 策略
├── .env                     # Supabase 凭证（VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY）
├── index.html
├── package.json
└── vite.config.js
```

## Supabase 配置
- 项目：qgkrmcpelcpqgnvhicsk.supabase.co
- 表：account_data (user_id, key, value, updated_at)，UNIQUE(user_id, key)
- 表：invite_codes (code, user_id, account_name, created_at)
- 表：shared_members (owner_id, member_id, created_at)
- Storage：photo2 桶（公开读取）
- RLS：auth.uid() = user_id OR user_id IN (SELECT owner_id FROM shared_members WHERE member_id = auth.uid())

## 部署
- GitHub Pages：https://yongkangliu61-byte.github.io/couple-site/
- 部署命令：`npm run build && npx gh-pages -d dist`

## 注意事项
- localStorage 有 5-10MB 限制，缩略图生成可大幅节省空间
- 照片优先上传 Supabase Storage，失败时回退 base64 本地存储
- 视频本地导入建议 < 30MB
- 共享模式下所有数据操作使用所有者的 user_id
