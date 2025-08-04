import { PublicClientApplication, Configuration, AuthenticationResult, SilentRequest, BrowserCacheLocation } from '@azure/msal-browser'
import { Client } from '@microsoft/microsoft-graph-client'
import { MobileCompatibilityUtils } from './mobileCompatibility'

type AuthState = {
    timestamp: number;
    accountId: string;
    username: string;
    accessToken: string;
} 

// 检测设备类型和浏览器
const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return { isMobile: false, isAndroidEdge: false, isWebView: false }
  }
  return MobileCompatibilityUtils.detectDevice()
}

// 检测是否为HTTPS环境
const isSecureContext = () => {
  if (typeof window === 'undefined') return false
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost'
}

// 动态获取重定向URI
const getRedirectUri = () => {
  if (typeof window === 'undefined') return ''
  
  // 检查是否为局域网访问
  const isLanAccess = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  
  if (isLanAccess) {
    // 局域网访问，使用实际的IP和端口
    return `${window.location.protocol}//${window.location.host}`
  } else {
    // 本地访问，使用环境变量或当前URL
    return process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI || window.location.origin
  }
}

// MSAL 基础配置
const createMSALConfig = (): Configuration => {
  const deviceInfo = getDeviceInfo()
  
  const baseConfig: Configuration = {
    auth: {
      clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: getRedirectUri(),
    },
    cache: {
      // Android Edge优先使用localStorage
      cacheLocation: deviceInfo.isAndroidEdge ? BrowserCacheLocation.LocalStorage : 
                    (deviceInfo.isMobile ? BrowserCacheLocation.SessionStorage : BrowserCacheLocation.LocalStorage),
      // Android Edge和所有移动端启用cookie存储
      storeAuthStateInCookie: deviceInfo.isMobile || !isSecureContext(),
      // 安全cookie配置
      secureCookies: isSecureContext(),
      // Android Edge启用声明缓存
      claimsBasedCachingEnabled: deviceInfo.isAndroidEdge,
    },
    system: {
      // Android Edge特殊超时配置
      windowHashTimeout: deviceInfo.isAndroidEdge ? 90000 : (deviceInfo.isMobile ? 60000 : 60000),
      iframeHashTimeout: deviceInfo.isAndroidEdge ? 10000 : 6000,
      // Android Edge导航延迟
      navigateFrameWait: deviceInfo.isAndroidEdge ? 500 : 0,
      // 安全配置
      allowRedirectInIframe: deviceInfo.isWebView, // 仅WebView允许iframe重定向
      // 日志配置
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return
          const prefix = deviceInfo.isAndroidEdge ? '[MSAL-AndroidEdge]' : '[MSAL]'
          switch (level) {
            case 0: // Error
              console.error(`${prefix} Error:`, message)
              break
            case 1: // Warning  
              console.warn(`${prefix} Warning:`, message)
              break
            case 2: // Info
              console.info(`${prefix} Info:`, message)
              break
            case 3: // Verbose
              if (deviceInfo.isAndroidEdge) {
                console.debug(`${prefix} Debug:`, message)
              }
              break
          }
        },
        piiLoggingEnabled: false,
        logLevel: deviceInfo.isAndroidEdge ? 1 : 2, // 更详细的Android Edge日志
      },
    },
  }

  // 使用移动兼容性工具的推荐配置
  return MobileCompatibilityUtils.getRecommendedMSALConfig(baseConfig)
}

// 权限范围
const loginRequest = {
  scopes: ['User.Read', 'Files.ReadWrite', 'openid', 'profile', 'email'],
}

export class MicrosoftAuthService {
  private msalInstance: PublicClientApplication | null = null
  private graphClient: Client | null = null
  private initializationPromise: Promise<void> | null = null
  private isInitialized = false
  private cryptoUnavailable = false
  private tokenRenewalTimer: NodeJS.Timeout | null = null
  private tokenRenewalPromise: Promise<string | null> | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      // Check if crypto API is available before creating MSAL instance
      const capabilities = MobileCompatibilityUtils.checkBrowserCapabilities()
      if (!capabilities.hasCrypto) {
        this.cryptoUnavailable = true
        console.warn('Web Crypto API not available - OneDrive sync will be disabled')
        return
      }
      
      // Create Android Edge optimized MSAL config
      const msalConfig = createMSALConfig()
      const deviceInfo = getDeviceInfo()
      
      if (deviceInfo.isAndroidEdge) {
        console.log('Initializing MSAL for Android Edge with optimized configuration')
      } else if (deviceInfo.isMobile) {
        console.log('Initializing MSAL for mobile device')
      }
      
      this.msalInstance = new PublicClientApplication(msalConfig)
    }
  }

  // 初始化MSAL - 增加幂等性和状态缓存
  async initialize(): Promise<void> {
    // 如果Crypto API不可用，抛出友好错误
    if (this.cryptoUnavailable) {
      const friendlyMessage = MobileCompatibilityUtils.getUserFriendlyErrorMessage(
        new Error('crypto_nonexistent: The crypto object or function is not available.')
      )
      throw new Error(friendlyMessage)
    }

    // 如果已经初始化，直接返回
    if (this.isInitialized) {
      return
    }

    // 如果正在初始化，等待完成
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    if (!this.msalInstance) return
    
    this.initializationPromise = (async () => {
      try {
        await this.msalInstance!.initialize()
        console.log('MSAL initialized successfully')
        
        // 设备兼容性检查和日志
        const deviceInfo = getDeviceInfo()
        if (deviceInfo.isAndroidEdge) {
          console.log('Android Edge detected, using optimized redirect-first authentication flow')
        } else if (deviceInfo.isMobile) {
          console.log('Mobile device detected, using enhanced compatibility mode')
        }

        // 初始化后立即检查是否有已保存的登录状态
        await this.restoreAuthState()
        
        this.isInitialized = true
        
      } catch (error) {
        console.error('MSAL initialization failed:', error)
        this.initializationPromise = null // 重置以允许重试
        
        // 针对crypto错误的特殊处理
        if (error instanceof Error && error.message.includes('crypto')) {
          throw new Error('您的浏览器不支持所需的加密功能。请尝试使用最新版本的浏览器，或在HTTPS环境下访问。')
        }
        
        throw error
      }
    })()

    return this.initializationPromise
  }

  // 恢复认证状态
  private async restoreAuthState(): Promise<void> {
    if (!this.msalInstance) return

    try {
      const accounts = this.msalInstance.getAllAccounts()
      if (accounts.length > 0) {
        console.log('Found existing account, attempting to restore session')
        
        // 尝试静默获取令牌以验证会话有效性
        const token = await this.getTokenSilently()
        if (token) {
          console.log('Session restored successfully')
          this.createGraphClient(token)
        } else {
          console.log('Session expired, will require re-authentication')
        }
      }
    } catch (error) {
      console.warn('Failed to restore auth state:', error)
    }
  }

  // 登录 - Android Edge优化的重定向优先流程
  async login(): Promise<AuthenticationResult> {
    if (this.cryptoUnavailable) {
      const friendlyMessage = MobileCompatibilityUtils.getUserFriendlyErrorMessage(
        new Error('crypto_nonexistent: The crypto object or function is not available.')
      )
      throw new Error(friendlyMessage)
    }

    if (!this.msalInstance) {
      throw new Error('MSAL instance not initialized')
    }

    try {
      const deviceInfo = getDeviceInfo()
      let response: AuthenticationResult
      
      if (deviceInfo.isAndroidEdge || deviceInfo.isMobile) {
        // Android Edge和移动端优先使用重定向登录
        console.log(`Starting ${deviceInfo.isAndroidEdge ? 'Android Edge' : 'mobile'} redirect authentication flow`)
        
        try {
          // 首先尝试处理重定向返回
          const redirectResponse = await this.msalInstance.handleRedirectPromise()
          if (redirectResponse) {
            console.log('Redirect authentication completed successfully')
            response = redirectResponse
          } else {
            // 没有重定向结果，检查是否已有账户（静默登录场景）
            const accounts = this.msalInstance.getAllAccounts()
            if (accounts.length > 0) {
              console.log('Existing account found, attempting silent token acquisition')
              const token = await this.getTokenSilently()
              if (token) {
                // 构造伪造的AuthenticationResult用于返回
                response = {
                  authority: this.msalInstance.getConfiguration().auth.authority!,
                  uniqueId: accounts[0].homeAccountId,
                  tenantId: accounts[0].tenantId || '',
                  scopes: loginRequest.scopes,
                  account: accounts[0],
                  idToken: '',
                  idTokenClaims: {},
                  accessToken: token,
                  fromCache: true,
                  expiresOn: null,
                  correlationId: '',
                  requestId: '',
                  extExpiresOn: null,
                  familyId: '',
                  tokenType: 'Bearer',
                  state: '',
                  cloudGraphHostName: '',
                  msGraphHost: '',
                } as AuthenticationResult
              } else {
                throw new Error('Silent token acquisition failed')
              }
            } else {
              // 开始新的重定向登录流程
              console.log('Starting new redirect login flow')
              await this.msalInstance.loginRedirect(loginRequest)
              // 重定向后页面会刷新，这里不会执行到
              throw new Error('Redirecting to Microsoft login page...')
            }
          }
        } catch (redirectError) {
          console.warn('Redirect login failed, attempting fallback:', redirectError)
          
if (redirectError instanceof Error && redirectError.message.includes('Redirecting')) {
            throw redirectError // 重新抛出重定向消息
          }
          
          // Android Edge重定向失败时的特殊处理
          if (deviceInfo.isAndroidEdge) {
            console.log('Android Edge redirect failed, trying popup with enhanced settings')
            // Android Edge可能需要用户手势触发弹窗
            throw new Error('请点击登录按钮后，在弹出的窗口中完成登录。如果没有弹窗出现，请允许浏览器显示弹窗。')
          }
          
          // 其他移动设备降级到弹窗
          response = await this.msalInstance.loginPopup(loginRequest)
        }
      } else {
        // 桌面端仍可使用弹窗登录
        console.log('Starting desktop popup authentication flow')
        response = await this.msalInstance.loginPopup(loginRequest)
      }
      
      console.log('Login successful:', response)
      
      // 创建Graph客户端
      this.createGraphClient(response.accessToken)
      
      return response
      
    } catch (error) {
      console.error('Login failed:', error)
      
      // 提供更友好的错误信息
      if (error instanceof Error) {
        // 如果是重定向消息，直接抛出
        if (error.message.includes('Redirecting')) {
          throw error
        }
        
        const friendlyMessage = MobileCompatibilityUtils.getUserFriendlyErrorMessage(error)
        throw new Error(friendlyMessage)
      }
      
      throw error
    }
  }

  // 静默获取令牌 - Android Edge增强版本，支持重试和自动续期
  async getTokenSilently(maxRetries: number = 3): Promise<string | null> {
    if (this.cryptoUnavailable) return null
    if (!this.msalInstance) return null

    // 如果已有正在进行的令牌续期，等待其完成
    if (this.tokenRenewalPromise) {
      console.log('Token renewal in progress, waiting...')
      return this.tokenRenewalPromise
    }

    this.tokenRenewalPromise = this.performTokenAcquisition(maxRetries)
    const result = await this.tokenRenewalPromise
    this.tokenRenewalPromise = null
    return result
  }

  // 执行令牌获取的核心逻辑
  private async performTokenAcquisition(maxRetries: number): Promise<string | null> {
    const accounts = this.msalInstance!.getAllAccounts()
    if (accounts.length === 0) {
      console.log('No accounts found for silent token acquisition')
      return null
    }

    const deviceInfo = getDeviceInfo()
    let lastError: Error | null = null

    // 重试逻辑，Android Edge可能需要多次尝试
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Token acquisition attempt ${attempt}/${maxRetries}`)

        const silentRequest: SilentRequest = {
          ...loginRequest,
          account: accounts[0],
          forceRefresh: attempt > 1, // 第一次尝试使用缓存，后续强制刷新
        }

        const response = await this.msalInstance!.acquireTokenSilent(silentRequest)
        
        // 获取成功，创建或更新Graph客户端
        this.createGraphClient(response.accessToken)
        
        // 保存认证状态到本地存储
        this.saveAuthState(response.accessToken, accounts[0])
        
        // 安排令牌自动续期（在过期前5分钟）
        this.scheduleTokenRenewal(response.expiresOn)
        
        console.log(`Token acquired silently on attempt ${attempt}`)
        return response.accessToken
        
      } catch (error) {
        lastError = error as Error
        console.warn(`Token acquisition attempt ${attempt} failed:`, error)
        
        // Android Edge特殊处理
        if (deviceInfo.isAndroidEdge && attempt < maxRetries) {
          // Android Edge可能需要短暂延迟
          console.log('Android Edge detected, adding delay before retry')
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
        
        // 如果是最后一次尝试，继续到错误处理
        if (attempt === maxRetries) {
          break
        }
      }
    }

    // 所有重试都失败了
    console.error('All token acquisition attempts failed:', lastError)
    
    // 清理过期的认证状态
    this.clearAuthState()
    this.clearTokenRenewalTimer()
    
    return null
  }

  // 安排令牌自动续期
  private scheduleTokenRenewal(expiresOn: Date | null): void {
    this.clearTokenRenewalTimer()
    
    if (!expiresOn) return

    const now = new Date()
    const expiresAt = new Date(expiresOn)
    const renewAt = new Date(expiresAt.getTime() - 5 * 60 * 1000) // 提前5分钟续期
    const msUntilRenewal = renewAt.getTime() - now.getTime()

    if (msUntilRenewal > 0) {
      console.log(`Token renewal scheduled in ${Math.round(msUntilRenewal / 1000 / 60)} minutes`)
      this.tokenRenewalTimer = setTimeout(async () => {
        console.log('Performing scheduled token renewal')
        await this.getTokenSilently(1) // 单次尝试的续期
      }, msUntilRenewal)
    }
  }

  // 清理令牌续期定时器
  private clearTokenRenewalTimer(): void {
    if (this.tokenRenewalTimer) {
      clearTimeout(this.tokenRenewalTimer)
      this.tokenRenewalTimer = null
    }
  }

  // 处理重定向返回 - Android Edge关键方法
  async handleRedirectPromise(): Promise<AuthenticationResult | null> {
    if (!this.msalInstance) return null

    try {
      const response = await this.msalInstance.handleRedirectPromise()
      if (response) {
        console.log('Redirect response processed successfully')
        // 创建Graph客户端
        this.createGraphClient(response.accessToken)
        // 保存认证状态
        this.saveAuthState(response.accessToken, response.account)
        return response
      }
      return null
    } catch (error) {
      console.error('Failed to handle redirect promise:', error)
      // 不抛出错误，让调用方处理
      return null
    }
  }

  // 退出登录 - 增强状态清理
  async logout(): Promise<void> {
    if (!this.msalInstance) return

    try {
      // 清理所有状态
      this.clearAuthState()
      this.clearTokenRenewalTimer()
      
      const deviceInfo = getDeviceInfo()
      
      // Android Edge和移动端使用重定向登出
      if (deviceInfo.isAndroidEdge || deviceInfo.isMobile) {
        console.log('Using redirect logout for mobile/Android Edge')
        await this.msalInstance.logoutRedirect({
          postLogoutRedirectUri: window.location.origin + '/health-calendar'
        })
      } else {
        // 桌面端使用弹窗登出
        await this.msalInstance.logoutPopup({
          postLogoutRedirectUri: window.location.origin + '/health-calendar'
        })
      }
      
      console.log('Logout successful')
    } catch (error) {
      console.error('Logout failed:', error)
      // 即使MSAL登出失败，也要清理本地状态
      this.clearAuthState()
      this.clearTokenRenewalTimer()
      throw error
    }
  }

  // 获取当前用户信息
  getCurrentUser(): any | null {
    if (!this.msalInstance) return null

    const accounts = this.msalInstance.getAllAccounts()
    return accounts.length > 0 ? accounts[0] : null
  }

  // 检查是否已登录
  isLoggedIn(): boolean {
    if (this.cryptoUnavailable) return false
    if (!this.msalInstance) return false
    return this.msalInstance.getAllAccounts().length > 0
  }

  // 检查是否可以使用OneDrive功能
  isOneDriveAvailable(): boolean {
    return !this.cryptoUnavailable && this.msalInstance !== null
  }

  // 获取不可用原因
  getUnavailabilityReason(): string | null {
    if (this.cryptoUnavailable) {
      return MobileCompatibilityUtils.getUserFriendlyErrorMessage(
        new Error('crypto_nonexistent: The crypto object or function is not available.')
      )
    }
    return null
  }

  // 创建Graph客户端
  private createGraphClient(accessToken: string): void {
    this.graphClient = Client.init({
      authProvider: async (done) => {
        done(null, accessToken)
      },
    })
  }

  // 获取Graph客户端
  getGraphClient(): Client | null {
    return this.graphClient
  }

  // 获取OneDrive根目录
  async getOneDriveRoot(): Promise<any> {
    if (!this.graphClient) {
      throw new Error('Graph client not initialized')
    }

    try {
      const driveItems = await this.graphClient.api('/me/drive/root/children').get()
      return driveItems
    } catch (error) {
      console.error('Failed to get OneDrive root:', error)
      throw error
    }
  }

  // 创建文件夹
  async createFolder(parentPath: string, folderName: string): Promise<any> {
    if (!this.graphClient) {
      throw new Error('Graph client not initialized')
    }

    try {
      const driveItem = {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      }

      const apiPath = parentPath === 'root' 
        ? '/me/drive/root/children'
        : `/me/drive/root:/${parentPath}:/children`

      const newFolder = await this.graphClient.api(apiPath).post(driveItem)
      return newFolder
    } catch (error) {
      console.error('Failed to create folder:', error)
      throw error
    }
  }

  // 检查文件夹是否存在
  async checkFolderExists(folderPath: string): Promise<boolean> {
    if (!this.graphClient) {
      throw new Error('Graph client not initialized')
    }

    try {
      await this.graphClient.api(`/me/drive/root:/${folderPath}`).get()
      return true
    } catch (error) {
      return false
    }
  }

  // 确保应用文件夹存在
  async ensureAppFolder(): Promise<string> {
    const appFolderPath = 'Apps/HealthCalendar'
    
    try {
      // 检查Apps文件夹
      const appsExists = await this.checkFolderExists('Apps')
      if (!appsExists) {
        await this.createFolder('root', 'Apps')
      }

      // 检查HealthCalendar文件夹
      const healthCalendarExists = await this.checkFolderExists(appFolderPath)
      if (!healthCalendarExists) {
        await this.createFolder('Apps', 'HealthCalendar')
      }

      return appFolderPath
    } catch (error) {
      console.error('Failed to ensure app folder:', error)
      throw error
    }
  }

  // 保存认证状态到本地存储
  private saveAuthState(accessToken: string, account: any): void {
    try {
      const authState:AuthState = {
        timestamp: Date.now(),
        accountId: account.homeAccountId,
        username: account.username,
        // 不保存实际令牌，只保存会话信息, why?
        accessToken: accessToken,
      }
      
      localStorage.setItem('healthcalendar_auth_state', JSON.stringify(authState))
      console.log('Auth state saved to localStorage')
    } catch (error) {
      console.warn('Failed to save auth state:', error)
    }
  }

  // 清理认证状态
  private clearAuthState(): void {
    try {
      localStorage.removeItem('healthcalendar_auth_state')
      this.graphClient = null
      this.clearTokenRenewalTimer()
      console.log('Auth state cleared')
    } catch (error) {
      console.warn('Failed to clear auth state:', error)
    }
  }

  // 检查保存的认证状态是否有效
  getAuthState(): AuthState | null {
    try {
      const savedState = localStorage.getItem('healthcalendar_auth_state')
      if (!savedState) return null

      const authState: AuthState = JSON.parse(savedState)

      return authState
    } catch (error) {
      return null
    }
  }

  // 检查保存的认证状态是否有效
  private isAuthStateValid(): boolean {
    try {
      const savedState = localStorage.getItem('healthcalendar_auth_state')
      if (!savedState) return false
      
      const authState = JSON.parse(savedState)
      const now = Date.now()
      const stateAge = now - authState.timestamp
      
      // 如果状态超过24小时，认为过期
      const maxAge = 24 * 60 * 60 * 1000
      return stateAge < maxAge
    } catch (error) {
      return false
    }
  }

  // 检查令牌是否即将过期（5分钟内）
  async isTokenExpiringSoon(): Promise<boolean> {
    if (!this.msalInstance) return true

    try {
      const accounts = this.msalInstance.getAllAccounts()
      if (accounts.length === 0) return true

      // 尝试静默获取令牌来检查有效性
      const silentRequest: SilentRequest = {
        ...loginRequest,
        account: accounts[0],
        forceRefresh: false,
      }

      const response = await this.msalInstance.acquireTokenSilent(silentRequest)
      
      if (response.expiresOn) {
        const now = new Date()
        const expiresAt = new Date(response.expiresOn)
        const msUntilExpiry = expiresAt.getTime() - now.getTime()
        const fiveMinutes = 5 * 60 * 1000
        
        return msUntilExpiry < fiveMinutes
      }
      
      return false
    } catch (error) {
      // 如果获取失败，认为令牌已过期
      return true
    }
  }

  // 主动刷新令牌
  async refreshToken(): Promise<string | null> {
    console.log('Proactively refreshing token')
    return this.getTokenSilently(1) // 单次尝试刷新
  }

}

// 单例实例
export const microsoftAuth = new MicrosoftAuthService()
