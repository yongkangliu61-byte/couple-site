# 情侣纪念网站

## 项目概述
为刘永康（boy）和成丽（girl）创建的专属情侣纪念网站，使用 React 18 + Vite 构建。

## 启动方式
```bash
cd "couple-site"
npm install --cache /tmp/npm-cache   # 如果 npm install 报权限错误
npm run dev                           # 开发模式启动
npm run build                         # 生产构建
```

## 技术栈
- React 18 + Vite
- react-router-dom（客户端路由）
- 纯 CSS 样式
- localStorage 数据持久化 + sessionStorage 认证
- Web Crypto API（SHA-256 密码哈希）

## 路由结构
| URL | 页面 | 组件 |
|-----|------|------|
| /login | 登录/注册 | Login.jsx |
| / | 首页（恋爱计时器） | Hero.jsx |
| /gallery | 照片（相册卡片 + 详情） | Gallery.jsx |
| /story | 故事（时间线） | Timeline.jsx |
| /countdown | 纪念日倒计时 | Countdown.jsx |
| /admin | 管理面板 | Admin.jsx |

## 数据架构
- `src/data/config.js` — 默认数据（coupleNames, startDate, anniversaries, timelineEvents, galleryPhotos, albumMeta, adminPasswordHash）
- `src/data/store.js` — 数据管理层，合并 localStorage 用户数据与 config 默认值
  - `getData(key)` → 优先返回 localStorage，否则返回 config 默认值
  - `saveData(key, data)` → 保存到 localStorage（key 前缀 `couple_`）
  - `isLoggedIn()` → 检查 sessionStorage 中的认证状态
  - `isAccountExists()` → 检查是否已创建账户
- `src/utils/helpers.js` — 共享工具函数（readFileAsBase64, createThumbnail, sha256）

## 关键功能
- 密码保护（首次访问显示注册页，之后显示登录页）
- 登录后所有页面可直接编辑（无需进入管理面板）
- 照片：相册卡片式布局 → 点击进入相册详情 → 支持单张添加和批量导入
- 批量导入支持进度条、并行处理、自动生成缩略图节省存储空间
- 故事时间线：支持图片和视频（URL 或本地文件导入，FileReader → base64）
- 所有数据通过 localStorage 持久化，config.js 提供默认值

## 文件结构
```
couple-site/
├── src/
│   ├── App.jsx              # 路由入口
│   ├── App.css              # 全局样式 + nav + footer
│   ├── main.jsx             # React 入口
│   ├── data/
│   │   ├── config.js        # 默认配置数据
│   │   └── store.js         # 数据存取层
│   ├── utils/
│   │   └── helpers.js       # 工具函数
│   └── components/
│       ├── Layout.jsx       # 共享布局（nav + footer + hearts）
│       ├── Layout.css
│       ├── Login.jsx        # 登录/注册
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
│       ├── Admin.jsx        # 管理面板
│       └── Admin.css
├── index.html
├── package.json
└── vite.config.js
```

## 注意事项
- npm 缓存权限问题：使用 `npm install --cache /tmp/npm-cache` 绕过
- localStorage 有 5-10MB 限制，缩略图生成可大幅节省空间
- 视频本地导入建议 < 30MB，Base64 编码会比原文件大约 33%
- 默认管理员密码：20240101（SHA-256 存储，可在管理面板修改）
