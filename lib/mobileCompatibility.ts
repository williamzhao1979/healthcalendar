// 移动端兼容性工具
export class MobileCompatibilityUtils {
  // 检测浏览器能力
  static checkBrowserCapabilities(): {
    hasCrypto: boolean
    hasLocalStorage: boolean
    hasSessionStorage: boolean
    isSecureContext: boolean
    supportsPopups: boolean
  } {
    const capabilities = {
      hasCrypto: false,
      hasLocalStorage: false,
      hasSessionStorage: false,
      isSecureContext: false,
      supportsPopups: false,
    }

    if (typeof window === 'undefined') {
      return capabilities
    }

    try {
      // 检查crypto API
      capabilities.hasCrypto = !!(window.crypto && window.crypto.subtle)
    } catch (e) {
      capabilities.hasCrypto = false
    }

    try {
      // 检查localStorage
      localStorage.setItem('test', 'test')
      localStorage.removeItem('test')
      capabilities.hasLocalStorage = true
    } catch (e) {
      capabilities.hasLocalStorage = false
    }

    try {
      // 检查sessionStorage
      sessionStorage.setItem('test', 'test')
      sessionStorage.removeItem('test')
      capabilities.hasSessionStorage = true
    } catch (e) {
      capabilities.hasSessionStorage = false
    }

    // 检查是否为安全上下文
    capabilities.isSecureContext = window.isSecureContext || 
                                  window.location.protocol === 'https:' || 
                                  window.location.hostname === 'localhost'

    // 检查是否支持弹窗（简单检测）
    capabilities.supportsPopups = !/(iPhone|iPad|iPod|Android)/i.test(navigator.userAgent) ||
                                  window.innerWidth > 768

    return capabilities
  }

  // 生成兼容性报告
  static generateCompatibilityReport(): string {
    const capabilities = this.checkBrowserCapabilities()
    const issues: string[] = []

    if (!capabilities.hasCrypto) {
      issues.push('浏览器不支持Web Cryptography API')
    }

    if (!capabilities.hasLocalStorage) {
      issues.push('浏览器不支持LocalStorage')
    }

    if (!capabilities.hasSessionStorage) {
      issues.push('浏览器不支持SessionStorage')
    }

    if (!capabilities.isSecureContext) {
      issues.push('当前环境不是安全上下文(HTTPS)')
    }

    if (!capabilities.supportsPopups) {
      issues.push('移动设备可能不支持弹窗登录')
    }

    if (issues.length === 0) {
      return '浏览器兼容性良好'
    }

    return `发现兼容性问题：\n${issues.join('\n')}`
  }

  // 获取推荐的MSAL配置
  static getRecommendedMSALConfig(baseConfig: any): any {
    const capabilities = this.checkBrowserCapabilities()
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    const config = { ...baseConfig }

    // 缓存配置优化
    if (!capabilities.hasLocalStorage || isMobile) {
      config.cache.cacheLocation = 'sessionStorage'
    }

    // 如果不是安全上下文或是移动端，启用cookie存储
    if (!capabilities.isSecureContext || isMobile) {
      config.cache.storeAuthStateInCookie = true
    }

    // 安全cookie配置
    if (capabilities.isSecureContext) {
      config.cache.secureCookies = true
    }

    return config
  }

  // 显示用户友好的错误信息
  static getUserFriendlyErrorMessage(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('crypto') || message.includes('cryptography')) {
      return '您的浏览器不支持所需的加密功能。请尝试：\n' +
             '• 使用最新版本的浏览器\n' +
             '• 确保使用HTTPS访问\n' +
             '• 尝试其他浏览器（Chrome、Safari、Edge）'
    }

    if (message.includes('popup') || message.includes('blocked')) {
      return '登录窗口被阻止。请：\n' +
             '• 允许此网站显示弹窗\n' +
             '• 检查浏览器弹窗拦截设置\n' +
             '• 尝试刷新页面重新登录'
    }

    if (message.includes('network') || message.includes('fetch')) {
      return '网络连接问题。请：\n' +
             '• 检查网络连接\n' +
             '• 确认可以访问Microsoft服务\n' +
             '• 稍后重试'
    }

    if (message.includes('redirect')) {
      return '页面重定向中，请稍候...'
    }

    if (message.includes('timeout')) {
      return '登录超时。请：\n' +
             '• 检查网络连接速度\n' +
             '• 重新尝试登录\n' +
             '• 清除浏览器缓存'
    }

    return `登录失败：${error.message}\n\n如果问题持续存在，请尝试使用其他浏览器或联系支持。`
  }
}

export default MobileCompatibilityUtils
