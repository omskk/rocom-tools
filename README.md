# 洛克王国工具集 🎮

为《洛克王国：世界》玩家打造的实用工具合集。

## 🌐 在线访问

**Vercel 部署**: （部署后自动生成链接）

## 🧰 工具列表

| 工具 | 路径 | 说明 |
|------|------|------|
| 🌸 刷花效率计算器 | `/flowers` | 计算采集花朵的效率 |
| 🔮 即将上线 | - | 更多工具开发中 |

## 📁 项目结构

```
rocom-tools/
├── app/
│   ├── page.tsx              → 首页（工具导航）
│   ├── layout.tsx            → 根布局
│   ├── globals.css           → 全局样式
│   └── flowers/
│       └── page.tsx          → 刷花计算器
├── public/                   → 静态资源
├── next.config.ts            → Next.js 配置
└── package.json
```

## 🚀 快速开始

### 本地开发

```bash
cd rocom-tools
npm install
npm run dev
```

访问 http://localhost:3000

### 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录并部署
cd rocom-tools
vercel login
vercel --prod
```

或者使用 GitHub + Vercel 自动部署：

1. 在 GitHub 创建新仓库
2. 推送代码
3. 在 Vercel Dashboard 导入仓库
4. 自动部署

## 📝 添加新工具

1. 在 `app/` 下创建新目录（如 `new-tool/page.tsx`）
2. 在 `app/page.tsx` 的 `tools` 数组中添加工具信息
3. 重新构建部署

## 🛠 技术栈

- Next.js 15
- TypeScript
- Tailwind CSS

## 📄 License

MIT
