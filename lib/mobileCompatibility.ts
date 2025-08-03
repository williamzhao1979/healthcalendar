// 移动端兼容性工具
export class MobileCompatibilityUtils {
  // 检测设备类型
  static detectDevice(): {
    isMobile: boolean
    isTablet: boolean
    isDesktop: boolean
    platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown'
    browserName: string
  } {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        platform: 'unknown',
        browserName: 'unknown'
      }
    }

    const userAgent = navigator.userAgent.toLowerCase()
    const screenWidth = window.innerWidth
    
    // 检测移动设备
    const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                     screenWidth <= 768
    
    // 检测平板
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent) || 
                     (screenWidth > 768 && screenWidth <= 1024)
    
    // 检测桌面
    const isDesktop = !isMobile && !isTablet
    
    // 检测平台
    let platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown' = 'unknown'
    if (/iphone|ipad|ipod/i.test(userAgent)) platform = 'ios'
    else if (/android/i.test(userAgent)) platform = 'android'
    else if (/windows/i.test(userAgent)) platform = 'windows'
    else if (/macintosh|mac os x/i.test(userAgent)) platform = 'macos'
    else if (/linux/i.test(userAgent)) platform = 'linux'
    
    // 检测浏览器
    let browserName = 'unknown'
    if (userAgent.includes('chrome')) browserName = 'chrome'
    else if (userAgent.includes('safari')) browserName = 'safari'
    else if (userAgent.includes('firefox')) browserName = 'firefox'
    else if (userAgent.includes('edge')) browserName = 'edge'
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      platform,
      browserName
    }
  }

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

  // 获取OneDrive初始化消息
  static getOneDriveInitMessage(): {
    title: string
    message: string
    tips: string[]
    isWarning: boolean
  } {
    const device = this.detectDevice()
    const capabilities = this.checkBrowserCapabilities()
    
    if (device.isMobile) {
      return {
        title: '移动设备OneDrive同步',
        message: '正在为移动设备优化OneDrive连接...',
        tips: [
          '确保使用HTTPS连接访问应用',
          '允许浏览器显示弹窗窗口',
          '如遇问题请尝试刷新页面',
          '建议使用WiFi网络进行首次同步'
        ],
        isWarning: !capabilities.isSecureContext
      }
    }
    
    if (device.isTablet) {
      return {
        title: '平板设备OneDrive同步',
        message: '正在配置平板设备的OneDrive连接...',
        tips: [
          '平板设备可能需要允许弹窗权限',
          '确保网络连接稳定',
          '首次同步可能需要较长时间'
        ],
        isWarning: false
      }
    }
    
    return {
      title: 'OneDrive云端同步',
      message: '正在连接到Microsoft OneDrive...',
      tips: [
        '您的数据将安全存储在Microsoft云端',
        '同步完成后可在多设备间访问',
        '请确保网络连接稳定'
      ],
      isWarning: false
    }
  }

  // 获取OneDrive同步进度消息
  static getSyncProgressMessage(step: string, progress: number): string {
    const device = this.detectDevice()
    
    const stepMessages: Record<string, string> = {
      connect: device.isMobile ? '正在建立移动设备连接...' : '正在连接OneDrive...',
      verify: '正在验证账户权限...',
      setup: '正在创建云端文件夹...',
      sync: device.isMobile ? '正在同步数据（移动网络可能较慢）...' : '正在同步数据...',
      users: '正在同步用户信息...',
      records: '正在同步个人记录...',
      stool: '正在同步排便记录...',
      meal: '正在同步饮食记录...',
      period: '正在同步生理记录...'
    }
    
    const message = stepMessages[step] || '正在处理...'
    return device.isMobile ? `${message} (${progress}%)` : `${message} ${progress}%`
  }

  // 获取OneDrive错误的移动端友好提示
  static getOneDriveErrorTips(error: Error): {
    title: string
    message: string
    solutions: string[]
    isRetryable: boolean
  } {
    const device = this.detectDevice()
    const capabilities = this.checkBrowserCapabilities()
    const message = error.message.toLowerCase()
    
    if (message.includes('crypto') || message.includes('cryptography')) {
      return {
        title: '加密功能不支持',
        message: device.isMobile ? '您的移动浏览器不支持所需的安全功能' : '浏览器缺少加密支持',
        solutions: device.isMobile ? [
          '请使用HTTPS地址访问应用',
          '尝试使用手机的默认浏览器',
          '更新浏览器到最新版本',
          '清除浏览器缓存后重试'
        ] : [
          '使用最新版本的浏览器',
          '确保使用HTTPS访问',
          '尝试Chrome、Safari或Edge浏览器'
        ],
        isRetryable: true
      }
    }
    
    if (message.includes('popup') || message.includes('blocked')) {
      return {
        title: '弹窗被阻止',
        message: device.isMobile ? '移动浏览器阻止了登录窗口' : '登录窗口被浏览器阻止',
        solutions: device.isMobile ? [
          '在浏览器设置中允许此网站显示弹窗',
          '点击地址栏的弹窗图标并允许',
          '尝试在新标签页中打开应用',
          '使用手机系统自带浏览器'
        ] : [
          '允许此网站显示弹窗',
          '检查浏览器弹窗拦截设置',
          '刷新页面重新尝试'
        ],
        isRetryable: true
      }
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        title: '网络连接问题',
        message: device.isMobile ? '移动网络连接不稳定' : '网络连接出现问题',
        solutions: device.isMobile ? [
          '检查移动网络或WiFi连接',
          '尝试切换到WiFi网络',
          '确认可以访问Microsoft网站',
          '稍后在网络良好时重试'
        ] : [
          '检查网络连接状态',
          '确认可以访问Microsoft服务',
          '尝试刷新页面'
        ],
        isRetryable: true
      }
    }
    
    if (message.includes('timeout')) {
      return {
        title: '连接超时',
        message: device.isMobile ? '移动网络响应超时' : '连接超时',
        solutions: device.isMobile ? [
          '检查移动网络信号强度',
          '尝试使用WiFi网络',
          '稍后重新尝试',
          '清除浏览器缓存'
        ] : [
          '检查网络连接速度',
          '重新尝试连接',
          '清除浏览器缓存'
        ],
        isRetryable: true
      }
    }
    
    return {
      title: '同步失败',
      message: `OneDrive同步遇到问题：${error.message}`,
      solutions: device.isMobile ? [
        '请检查移动网络连接',
        '尝试刷新页面',
        '使用HTTPS连接',
        '清除浏览器数据后重试'
      ] : [
        '请检查网络连接',
        '尝试刷新页面',
        '稍后重试'
      ],
      isRetryable: true
    }
  }

  // 显示用户友好的错误信息
  static getUserFriendlyErrorMessage(error: Error): string {
    const device = this.detectDevice()
    const errorTips = this.getOneDriveErrorTips(error)
    
    let message = `${errorTips.title}\n${errorTips.message}\n\n解决方案：\n`
    message += errorTips.solutions.map(solution => `• ${solution}`).join('\n')
    
    if (device.isMobile) {
      message += '\n\n💡 移动设备提示：建议使用设备自带浏览器或Chrome浏览器'
    }
    
    return message
  }
}

export default MobileCompatibilityUtils
