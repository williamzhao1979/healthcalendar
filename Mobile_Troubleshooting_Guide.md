# 移动端OneDrive同步故障排除指南

## 常见错误及解决方案

### 1. crypto_nonexistent 错误

**错误信息**: `BrowserAuthError: crypto_nonexistent: The crypto object or function is not available.`

**原因**: 移动端浏览器在非HTTPS环境下不支持Web Cryptography API

**解决方案**:
1. **使用HTTPS**: 确保应用部署在HTTPS环境下
2. **更新浏览器**: 使用最新版本的浏览器
3. **尝试其他浏览器**: 
   - iOS: Safari (推荐), Chrome
   - Android: Chrome (推荐), Firefox, Samsung Internet
4. **检查浏览器设置**: 确保JavaScript已启用

### 2. 弹窗被阻止

**症状**: 登录窗口不出现或立即关闭

**解决方案**:
1. 允许网站显示弹窗
2. 检查浏览器弹窗拦截设置
3. 在移动端会自动切换到重定向登录方式

### 3. 存储权限问题

**症状**: 无法保存认证状态

**解决方案**:
1. 清除浏览器缓存和Cookie
2. 检查浏览器隐私设置
3. 移动端会自动使用SessionStorage和Cookie存储

### 4. 网络连接问题

**症状**: 登录超时或连接失败

**解决方案**:
1. 检查网络连接
2. 确认可以访问Microsoft服务
3. 尝试切换WiFi/移动数据
4. 检查防火墙设置

## 移动端优化

### 自动适配功能

应用已针对移动端进行以下优化：

1. **登录方式**:
   - 移动端: 重定向登录（主要）+ 弹窗登录（备用）
   - 桌面端: 弹窗登录

2. **存储策略**:
   - 移动端: SessionStorage + Cookie
   - 桌面端: LocalStorage

3. **错误处理**:
   - 友好的移动端错误提示
   - 自动重试机制
   - 降级方案

### 浏览器兼容性

#### 推荐浏览器

**iOS**:
- ✅ Safari 14+
- ✅ Chrome 90+
- ✅ Edge 90+

**Android**:
- ✅ Chrome 90+
- ✅ Firefox 90+
- ✅ Samsung Internet 15+
- ⚠️ UC Browser (部分功能受限)

#### 不支持的浏览器
- ❌ Internet Explorer 所有版本
- ❌ 过旧版本的移动浏览器 (iOS < 14, Android < 7)

## 开发环境配置

### 本地HTTPS设置

对于开发环境，如需在移动设备上测试，建议设置HTTPS：

1. **使用mkcert**:
```bash
# 安装mkcert
npm install -g mkcert

# 生成本地CA
mkcert -install

# 生成证书
mkcert localhost 192.168.x.x

# 配置Next.js使用HTTPS
# 在package.json中修改dev脚本
"dev": "next dev --experimental-https"
```

2. **或使用ngrok**:
```bash
# 安装ngrok
npm install -g ngrok

# 启动应用
npm run dev

# 在另一个终端创建HTTPS隧道
ngrok http 3001
```

### Azure应用注册配置

确保在Azure应用注册中添加所有重定向URI：

**开发环境**:
- `http://localhost:3001`
- `https://localhost:3001`
- `https://your-ngrok-url.ngrok.io`

**生产环境**:
- `https://yourdomain.com`

## 故障诊断工具

### 兼容性检查器

应用内置了兼容性检查器，可以：
- 检测浏览器能力
- 显示兼容性状态
- 提供针对性建议

访问 `/onedrive-test` 页面查看详细的兼容性报告。

### 调试日志

在浏览器开发者工具的Console中查看详细日志：
- `[MSAL Info]`: 正常信息
- `[MSAL Warning]`: 警告信息  
- `[MSAL Error]`: 错误信息

### 常用调试命令

```javascript
// 检查crypto支持
console.log('Crypto支持:', !!(window.crypto && window.crypto.subtle))

// 检查存储支持
console.log('LocalStorage支持:', typeof(Storage) !== "undefined")

// 检查安全上下文
console.log('安全上下文:', window.isSecureContext)

// 检查用户代理
console.log('用户代理:', navigator.userAgent)
```

---

**更新时间**: 2025年7月24日  
**适用版本**: v1.0+
