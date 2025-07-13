# 🏥 健康日历 - Microsoft 认证登录系统

这是一个基于 Next.js 构建的健康日历应用，支持 Microsoft 账户登录和日历同步功能。

## ✨ 功能特性

- 🔐 **Microsoft 账户认证** - 安全的 Azure AD 登录
- 📅 **日历同步** - 与 Microsoft 日历无缝集成
- 💾 **数据存储** - 支持 OneDrive 文件存储
- 🎨 **现代化 UI** - 响应式设计，支持深色模式
- 🔒 **隐私保护** - 遵循最佳安全实践

## 🚀 快速开始

### 方法 1: 使用启动脚本（推荐）

**Windows 用户：**
\`\`\`powershell
.\start.ps1
\`\`\`

**Linux/Mac 用户：**
\`\`\`bash
chmod +x start.sh
./start.sh
\`\`\`

### 方法 2: 手动设置

1. **安装依赖**
   \`\`\`bash
   npm install
   \`\`\`

2. **配置环境变量**
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`
   然后编辑 `.env.local` 文件，设置您的 Microsoft 客户端 ID。

3. **启动开发服务器**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **访问应用**
   打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## ⚙️ Microsoft Azure 配置

### 重要提醒
目前您遇到的错误表明 Azure 应用注册配置不正确。请按照以下步骤修复：

1. **登录 Azure Portal**
   - 访问 [Azure Portal](https://portal.azure.com)
   - 进入 "App registrations"（应用注册）

2. **修改应用配置**
   - 找到您的应用（客户端 ID: `67044ccc-4dcb-4d7d-b4ca-b79befe0056d`）
   - 在 "Authentication" 中删除现有的 "Web" 平台
   - 添加 "Single-page application" 平台
   - 设置重定向 URI 为 `http://localhost:3000`

3. **配置权限**
   - 在 "API permissions" 中添加以下权限：
     - `User.Read`
     - `Calendars.ReadWrite`
     - `Files.ReadWrite.All`
   - 授予管理员同意

详细配置指南请查看：
- 📖 [MICROSOFT_SETUP.md](./MICROSOFT_SETUP.md) - 完整设置教程
- 🔧 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 错误修复指南

## 📁 项目结构

\`\`\`
healthcalendar/
├── src/
│   └── app/
│       ├── page.tsx           # 主登录页面
│       ├── layout.tsx         # 布局组件
│       └── globals.css        # 全局样式
├── public/                    # 静态资源
├── .env.local.example         # 环境变量模板
├── MICROSOFT_SETUP.md         # Microsoft 设置指南
├── TROUBLESHOOTING.md         # 故障排除指南
├── start.ps1                  # Windows 启动脚本
└── start.sh                   # Linux/Mac 启动脚本
\`\`\`

## 🛠️ 技术栈

- **框架**: Next.js 15 (React 19)
- **样式**: Tailwind CSS 4
- **认证**: Microsoft Authentication Library (MSAL)
- **语言**: TypeScript
- **存储**: Microsoft Graph API

## 🔧 常见问题

### 错误: AADSTS70002 - 需要 client_secret
这表示您的 Azure 应用配置为 "Web 应用" 而不是 "单页应用程序"。请按照故障排除指南修复配置。

### 弹窗被阻止
请在浏览器中允许弹窗，或暂时关闭弹窗阻止程序。

### 权限被拒绝
确保在 Azure Portal 中已授予所需的 API 权限并获得管理员同意。

更多问题解决方案请查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如果您遇到问题：
1. 查看 [故障排除指南](./TROUBLESHOOTING.md)
2. 检查 [GitHub Issues](https://github.com/your-repo/healthcalendar/issues)
3. 提交新的 Issue

---

> 💡 **提示**: 确保您的 Azure 应用注册配置为"单页应用程序(SPA)"类型，这是解决当前登录错误的关键步骤。
