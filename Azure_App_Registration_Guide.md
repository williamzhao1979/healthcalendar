# Microsoft Azure应用注册配置指南

## 1. 创建Azure应用注册

### 1.1 访问Azure门户
1. 打开 [Azure Portal](https://portal.azure.com/)
2. 登录你的Microsoft账户

### 1.2 注册新应用
1. 在搜索栏输入"App registrations"并选择
2. 点击"New registration"
3. 填写应用信息：
   - **Name**: HealthCalendar
   - **Supported account types**: 选择"Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI**: 
     - Platform: Single-page application (SPA)
     - URI: `http://localhost:3001` (开发环境)

## 2. 配置应用权限

### 2.1 API权限设置
1. 在应用注册页面，点击左侧菜单"API permissions"
2. 点击"Add a permission"
3. 选择"Microsoft Graph"
4. 选择"Delegated permissions"
5. 添加以下权限：
   - `User.Read` - 读取用户基本信息
   - `Files.ReadWrite` - 读写OneDrive文件
   - `openid` - OpenID Connect登录
   - `profile` - 读取用户配置文件
   - `email` - 读取用户邮箱

### 2.2 授予管理员同意
1. 点击"Grant admin consent for [Your Organization]"
2. 确认授权

## 3. 获取配置信息

### 3.1 客户端ID
1. 在"Overview"页面找到"Application (client) ID"
2. 复制此ID到环境变量：`NEXT_PUBLIC_MICROSOFT_CLIENT_ID`

### 3.2 租户ID (可选)
1. 在"Overview"页面找到"Directory (tenant) ID"
2. 对于多租户应用，可以使用"common"

## 4. 当前配置状态

### 环境变量 (.env.local)
```bash
# Microsoft 认证配置
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=67044ccc-4dcb-4d7d-b4ca-b79befe0056d
NEXT_PUBLIC_MICROSOFT_TENANT_ID=common
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=http://localhost:3001
```

### 已配置的权限范围
- `User.Read` - 基本用户信息
- `Files.ReadWrite` - OneDrive文件访问
- `openid` - 身份验证
- `profile` - 用户配置文件
- `email` - 邮箱地址

## 5. 测试认证功能

### 测试页面
访问: `http://localhost:3001/onedrive-test`

### 测试步骤
1. 点击"连接 OneDrive"按钮
2. 会弹出Microsoft登录窗口
3. 输入你的Microsoft账户凭据
4. 授权应用访问OneDrive
5. 成功后应该显示用户信息和连接状态

### 主应用集成
1. 访问: `http://localhost:3001`
2. 点击右上角用户菜单
3. 切换到"设置"标签页
4. 找到"OneDrive同步"开关
5. 开启同步功能

## 6. 故障排除

### 常见错误
1. **AADSTS50011**: 重定向URI不匹配
   - 检查Azure应用注册中的重定向URI是否正确
   - 确保URI完全匹配（包括协议、域名、端口）

2. **权限不足错误**
   - 检查API权限是否正确配置
   - 确保已授予管理员同意

3. **CORS错误**
   - 确保使用的是Single-page application (SPA)平台类型
   - 不要使用Web平台类型

### 调试信息
- 在测试页面底部有详细的调试信息
- 查看浏览器控制台的错误日志
- 检查网络请求是否成功

## 7. 生产环境配置

### 生产环境重定向URI
需要在Azure应用注册中添加生产环境的重定向URI：
- `https://yourdomain.com`
- `https://www.yourdomain.com`

### 环境变量更新
生产环境需要更新：
```bash
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=https://yourdomain.com
```

---

**更新时间**: 2025年7月24日  
**状态**: 开发环境配置完成
