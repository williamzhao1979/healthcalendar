# 移动端 OneDrive 同步测试指南

## 概述
本指南旨在帮助用户在移动设备上测试和诊断 OneDrive 同步功能，特别是解决 `crypto_nonexistent` 错误。

## 测试步骤

### 1. 访问测试页面
- 在移动浏览器中访问：`http://localhost:3001/onedrive-test`
- 或使用局域网IP：`http://192.168.0.4:3001/onedrive-test`

### 2. 检查设备信息
页面顶部会显示：
- **设备类型**：移动设备 / 桌面设备
- **Crypto API**：支持 / 不支持
- **HTTPS**：安全连接 / HTTP连接
- **User Agent**：完整的浏览器标识信息

### 3. 兼容性检查
查看兼容性检查器结果：
- ✅ 绿色：功能正常
- ⚠️ 黄色：功能有限制
- ❌ 红色：功能不可用

### 4. 测试认证
1. 点击 "连接 OneDrive" 按钮
2. 观察是否出现认证弹窗
3. 完成 Microsoft 账户登录

### 5. 测试数据导出
1. 认证成功后，在数据导出测试区域
2. 输入用户ID (如: `user_self`)
3. 选择要导出的表（可选）
4. 点击 "导出所有数据" 或 "导出[表名]"

## 常见问题与解决方案

### BrowserAuthError: crypto_nonexistent

**原因**：移动浏览器在非HTTPS环境下无法访问Web Cryptography API

**解决方案**：
1. **使用HTTPS**
   ```bash
   # 在开发服务器中启用HTTPS
   npm run dev:https
   ```

2. **浏览器设置**
   - Chrome：启用 "不安全来源的强大功能"
   - Firefox：在 about:config 中设置 dom.webcrypto.enabled = true
   - Safari：检查安全设置

3. **使用备用浏览器**
   - 尝试不同的移动浏览器
   - 使用内置浏览器而非WebView

### 认证失败

**可能原因**：
- 网络连接问题
- 应用配置错误
- 移动浏览器限制

**解决方案**：
1. 检查网络连接
2. 清除浏览器缓存和Cookie
3. 尝试使用无痕模式
4. 确认Azure应用注册配置

### 导出失败

**可能原因**：
- IndexedDB访问受限
- 文件系统权限问题
- OneDrive API配额限制

**解决方案**：
1. 检查浏览器存储权限
2. 确认OneDrive有足够空间
3. 检查网络连接稳定性

## 调试工具

### 1. 浏览器开发者工具
- **Console**：查看详细错误信息
- **Network**：监控API请求
- **Application**：检查IndexedDB和存储

### 2. 页面调试信息
测试页面底部显示完整的状态信息：
```json
{
  "isAuthenticated": false,
  "isConnecting": false,
  "error": "详细错误信息",
  "browserCapabilities": {
    "crypto": false,
    "https": false,
    "localStorage": true
  }
}
```

### 3. 移动端特定检查
```javascript
// 在浏览器控制台中运行
console.log('Crypto API:', !!window.crypto?.subtle);
console.log('HTTPS:', location.protocol === 'https:');
console.log('User Agent:', navigator.userAgent);
console.log('LocalStorage:', !!window.localStorage);
console.log('IndexedDB:', !!window.indexedDB);
```

## 支持的浏览器

### 完全支持 (HTTPS)
- Chrome 60+
- Firefox 57+
- Safari 11+
- Edge 79+

### 有限支持 (HTTP)
- Chrome 60+ (部分功能)
- Firefox 57+ (部分功能)
- Safari 11+ (受限)

### 不支持
- Internet Explorer
- 旧版本移动浏览器
- 某些内嵌WebView

## 最佳实践

1. **开发环境**
   - 使用HTTPS本地服务器
   - 配置有效的SSL证书
   - 测试多种设备和浏览器

2. **生产环境**
   - 确保HTTPS部署
   - 配置正确的CORS设置
   - 监控错误日志

3. **用户体验**
   - 提供清晰的错误提示
   - 显示兼容性状态
   - 提供备用方案

## 故障排除检查清单

- [ ] 设备类型检测正确
- [ ] Crypto API可用性
- [ ] HTTPS连接状态
- [ ] 浏览器版本兼容
- [ ] 网络连接稳定
- [ ] Azure应用配置正确
- [ ] IndexedDB访问正常
- [ ] OneDrive权限充足

## 联系支持

如果问题仍然存在，请提供以下信息：
1. 设备型号和操作系统版本
2. 浏览器类型和版本
3. 完整的错误信息
4. 网络环境描述
5. 重现步骤
