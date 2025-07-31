import { PublicClientApplication, Configuration, AuthenticationResult, SilentRequest, BrowserCacheLocation } from '@azure/msal-browser'
import { Client } from '@microsoft/microsoft-graph-client'


type AuthState = {
    timestamp: number;
    accountId: string;
    username: string;
    accessToken: string;
} 

// 检测是否为移动设备
const isMobile = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
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

// MSAL 配置
const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: getRedirectUri(),
  },
  cache: {
    // 移动端使用sessionStorage，桌面端使用localStorage
    cacheLocation: isMobile() ? BrowserCacheLocation.SessionStorage : BrowserCacheLocation.LocalStorage,
    // 移动端启用cookie存储以提高兼容性
    storeAuthStateInCookie: isMobile() || !isSecureContext(),
    // 添加安全上下文检查
    secureCookies: isSecureContext(),
  },
  system: {
    // 移动端优化配置
    windowHashTimeout: 60000, // 增加超时时间
    iframeHashTimeout: 6000,
    // 日志配置
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        switch (level) {
          case 0: // Error
            console.error('[MSAL Error]:', message)
            break
          case 1: // Warning  
            console.warn('[MSAL Warning]:', message)
            break
          case 2: // Info
            console.info('[MSAL Info]:', message)
            break
          case 3: // Verbose
            console.debug('[MSAL Debug]:', message)
            break
        }
      },
      piiLoggingEnabled: false,
    },
  },
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

  constructor() {
    if (typeof window !== 'undefined') {
      this.msalInstance = new PublicClientApplication(msalConfig)
    }
  }

  // 初始化MSAL - 增加幂等性和状态缓存
  async initialize(): Promise<void> {
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
        
        // 在移动端添加额外的兼容性检查
        if (isMobile()) {
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

  // 登录 - 增强移动端支持
  async login(): Promise<AuthenticationResult> {
    if (!this.msalInstance) {
      throw new Error('MSAL instance not initialized')
    }

    try {
      // 移动端使用重定向方式，桌面端使用弹窗
      let response: AuthenticationResult
      
      if (isMobile()) {
        // 移动端使用重定向登录
        try {
          // 首先尝试处理重定向返回
          const redirectResponse = await this.msalInstance.handleRedirectPromise()
          if (redirectResponse) {
            response = redirectResponse
          } else {
            // 如果没有重定向结果，开始新的登录流程
            await this.msalInstance.loginRedirect(loginRequest)
            // 重定向后页面会刷新，这里不会执行到
            throw new Error('Redirecting to login...')
          }
        } catch (error) {
          console.error('Redirect login error:', error)
          // 如果重定向失败，降级到弹窗登录
          response = await this.msalInstance.loginPopup(loginRequest)
        }
      } else {
        // 桌面端使用弹窗登录
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
        if (error.message.includes('crypto')) {
          throw new Error('登录失败：浏览器不支持所需的加密功能。请使用最新版本的浏览器。')
        } else if (error.message.includes('popup')) {
          throw new Error('登录失败：弹窗被阻止。请允许弹窗或尝试刷新页面。')
        } else if (error.message.includes('network')) {
          throw new Error('登录失败：网络连接问题。请检查网络连接。')
        }
      }
      
      throw error
    }
  }

  // 静默获取令牌 - 增强持久化和重试机制
  async getTokenSilently(): Promise<string | null> {
    if (!this.msalInstance) return null

    try {
      const accounts = this.msalInstance.getAllAccounts()
      if (accounts.length === 0) {
        console.log('No accounts found for silent token acquisition')
        return null
      }

      const silentRequest: SilentRequest = {
        ...loginRequest,
        account: accounts[0],
        forceRefresh: false, // 首先尝试使用缓存的令牌
      }

      let response = await this.msalInstance.acquireTokenSilent(silentRequest)
      
      // 如果获取成功，创建或更新Graph客户端
      this.createGraphClient(response.accessToken)
      
      // 保存认证状态到本地存储
      this.saveAuthState(response.accessToken, accounts[0])
      
      console.log('Token acquired silently')
      return response.accessToken
      
    } catch (error) {
      console.warn('Silent token acquisition failed:', error)
      
      // 如果静默获取失败，尝试强制刷新
      try {
        const accounts = this.msalInstance.getAllAccounts()
        if (accounts.length > 0) {
          const forceRefreshRequest: SilentRequest = {
            ...loginRequest,
            account: accounts[0],
            forceRefresh: true,
          }
          
          const response = await this.msalInstance.acquireTokenSilent(forceRefreshRequest)
          this.createGraphClient(response.accessToken)
          this.saveAuthState(response.accessToken, accounts[0])
          
          console.log('Token refreshed successfully')
          return response.accessToken
        }
      } catch (refreshError) {
        console.error('Token refresh also failed:', refreshError)
      }
      
      // 清理过期的认证状态
      this.clearAuthState()
      return null
    }
  }

  // 退出登录 - 增强状态清理
  async logout(): Promise<void> {
    if (!this.msalInstance) return

    try {
      // 清理本地认证状态
      this.clearAuthState()
      
      // 执行MSAL登出
      await this.msalInstance.logoutPopup()
      
      console.log('Logout successful')
    } catch (error) {
      console.error('Logout failed:', error)
      // 即使MSAL登出失败，也要清理本地状态
      this.clearAuthState()
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
    if (!this.msalInstance) return false
    return this.msalInstance.getAllAccounts().length > 0
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

}

// 单例实例
export const microsoftAuth = new MicrosoftAuthService()
