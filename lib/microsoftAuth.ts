import { PublicClientApplication, Configuration, AuthenticationResult, SilentRequest, BrowserCacheLocation } from '@azure/msal-browser'
import { Client } from '@microsoft/microsoft-graph-client'

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

// MSAL 配置
const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
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

  constructor() {
    if (typeof window !== 'undefined') {
      this.msalInstance = new PublicClientApplication(msalConfig)
    }
  }

  // 初始化MSAL
  async initialize(): Promise<void> {
    if (!this.msalInstance) return
    
    try {
      await this.msalInstance.initialize()
      console.log('MSAL initialized successfully')
      
      // 在移动端添加额外的兼容性检查
      if (isMobile()) {
        console.log('Mobile device detected, using enhanced compatibility mode')
      }
      
    } catch (error) {
      console.error('MSAL initialization failed:', error)
      
      // 针对crypto错误的特殊处理
      if (error instanceof Error && error.message.includes('crypto')) {
        throw new Error('您的浏览器不支持所需的加密功能。请尝试使用最新版本的浏览器，或在HTTPS环境下访问。')
      }
      
      throw error
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

  // 静默获取令牌
  async getTokenSilently(): Promise<string | null> {
    if (!this.msalInstance) return null

    try {
      const accounts = this.msalInstance.getAllAccounts()
      if (accounts.length === 0) {
        return null
      }

      const silentRequest: SilentRequest = {
        ...loginRequest,
        account: accounts[0],
      }

      const response = await this.msalInstance.acquireTokenSilent(silentRequest)
      this.createGraphClient(response.accessToken)
      return response.accessToken
    } catch (error) {
      console.error('Silent token acquisition failed:', error)
      return null
    }
  }

  // 退出登录
  async logout(): Promise<void> {
    if (!this.msalInstance) return

    try {
      await this.msalInstance.logoutPopup()
      this.graphClient = null
      console.log('Logout successful')
    } catch (error) {
      console.error('Logout failed:', error)
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
}

// 单例实例
export const microsoftAuth = new MicrosoftAuthService()
