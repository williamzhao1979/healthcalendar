import { userDB } from './userDatabase'
import { microsoftAuth } from './microsoftAuth'
import { getPageFiles } from 'next/dist/server/get-page-files'
import { adminService } from '@/lib/adminService'

export interface ExportMetadata {
  version: string
  exportTime: string
  userId: string
  appVersion: string
  tables: string[]
}

export interface ExportResult {
  success: boolean
  exportedFiles: string[]
  errors: string[]
  metadata: ExportMetadata
}

export class DataExportService {
  private readonly APP_FOLDER_PATH = 'Apps/HealthCalendar'

  // 检查OneDrive连接性
  async checkOneDriveConnectivity(): Promise<{ connected: boolean; error?: string }> {
    try {
      const graphClient = microsoftAuth.getGraphClient()
      if (!graphClient) {
        return { connected: false, error: 'Graph client not initialized' }
      }

      if (!microsoftAuth.isLoggedIn()) {
        return { connected: false, error: 'User not authenticated with OneDrive' }
      }

      // 尝试访问用户的驱动器信息
      await graphClient.api('/me/drive').get()
      return { connected: true }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('OneDrive connectivity check failed:', errorMessage)
      return { connected: false, error: errorMessage }
    }
  }

  // 确保应用文件夹存在
  async ensureAppFolder(): Promise<boolean> {
    try {
      const graphClient = microsoftAuth.getGraphClient()
      if (!graphClient) {
        throw new Error('Graph client not initialized')
      }

      // 检查应用文件夹是否存在
      const folderExists = await this.checkFolderExists(this.APP_FOLDER_PATH)
      if (!folderExists) {
        // 创建应用文件夹
        await this.createFolder('Apps', 'HealthCalendar')
        console.log('Created HealthCalendar app folder')
      }
      
      return true
    } catch (error) {
      console.error('Failed to ensure app folder:', error)
      return false
    }
  }

  // 获取IndexedDB中的所有表名
  private async getDatabaseTables(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HealthCalendarDB')
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const tableNames = Array.from(db.objectStoreNames)
        db.close()
        resolve(tableNames)
      }
      
      request.onerror = () => {
        reject(new Error('Failed to open database'))
      }
    })
  }

  // 导出单个表的数据
  private async exportTableData(tableName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HealthCalendarDB')
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        try {
          const transaction = db.transaction([tableName], 'readonly')
          const store = transaction.objectStore(tableName)
          const getAllRequest = store.getAll()
          
          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result)
          }
          
          getAllRequest.onerror = () => {
            reject(new Error(`Failed to export data from table: ${tableName}`))
          }
        } catch (error) {
          reject(new Error(`Table ${tableName} does not exist`))
        } finally {
          db.close()
        }
      }
      
      request.onerror = () => {
        reject(new Error('Failed to open database'))
      }
    })
  }

  // 生成导出元数据
  private generateMetadata(userId: string, tables: string[]): ExportMetadata {
    return {
      version: '1.0',
      exportTime: new Date().toISOString(),
      userId: userId,
      appVersion: process.env.npm_package_version || '1.0.0',
      tables: tables
    }
  }

  // 确保用户目录存在
  private async ensureUserDirectory_orig(userId: string): Promise<string> {
    const graphClient = microsoftAuth.getGraphClient()
    if (!graphClient) {
      throw new Error('Graph client not initialized')
    }

    const userDirPath = `${this.APP_FOLDER_PATH}/users/${userId}`
    const dataDirPath = `${userDirPath}/data`

    try {
      // 检查并创建users目录
      const usersExists = await this.checkFolderExists(`${this.APP_FOLDER_PATH}/users`)
      if (!usersExists) {
        await this.createFolder(this.APP_FOLDER_PATH, 'users')
      }

      // 检查并创建用户目录
      const userExists = await this.checkFolderExists(userDirPath)
      if (!userExists) {
        await this.createFolder(`${this.APP_FOLDER_PATH}/users`, userId)
      }

      // 检查并创建data目录
      const dataExists = await this.checkFolderExists(dataDirPath)
      if (!dataExists) {
        await this.createFolder(userDirPath, 'data')
      }

      return dataDirPath
    } catch (error) {
      console.error('Failed to ensure user directory:', error)
      throw error
    }
  }

  // 确保用户目录存在
  private async ensureUserDirectory(userId: string): Promise<string> {
    const graphClient = microsoftAuth.getGraphClient()
    if (!graphClient) {
      throw new Error('Graph client not initialized')
    }

    const userDirPath = `${this.APP_FOLDER_PATH}/users/${userId}`
    const dataDirPath = `${this.APP_FOLDER_PATH}`

    try {
       return dataDirPath
    } catch (error) {
      console.error('Failed to ensure user directory:', error)
      throw error
    }
  }

  // 检查文件夹是否存在
  private async checkFolderExists(folderPath: string): Promise<boolean> {
    const graphClient = microsoftAuth.getGraphClient()
    if (!graphClient) return false

    try {
      await graphClient.api(`/me/drive/root:/${folderPath}`).get()
      return true
    } catch (error) {
      return false
    }
  }

  // 创建文件夹
  private async createFolder(parentPath: string, folderName: string): Promise<any> {
    const graphClient = microsoftAuth.getGraphClient()
    if (!graphClient) {
      throw new Error('Graph client not initialized')
    }

    try {
      const driveItem = {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      }

      const apiPath = `/me/drive/root:/${parentPath}:/children`
      const newFolder = await graphClient.api(apiPath).post(driveItem)
      return newFolder
    } catch (error) {
      console.error('Failed to create folder:', error)
      throw error
    }
  }

  // 上传JSON文件到OneDrive
  private async uploadJsonFile(filePath: string, data: any): Promise<void> {
    const graphClient = microsoftAuth.getGraphClient()
    if (!graphClient) {
      throw new Error('Graph client not initialized')
    }

    try {
      const jsonContent = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      
      const uploadPath = `/me/drive/root:/${filePath}:/content`
      await graphClient.api(uploadPath).put(blob)
      
      console.log(`Successfully uploaded: ${filePath}`)
    } catch (error) {
      console.error(`Failed to upload file ${filePath}:`, error)
      throw error
    }
  }

  // 导出所有数据表
  async exportAllTables(userId: string): Promise<ExportResult> {
    try {
      // 确保用户已认证
      if (!microsoftAuth.isLoggedIn()) {
        throw new Error('User not authenticated with OneDrive')
      }

      // 获取所有表名
      const tables = await this.getDatabaseTables()
      console.log('Found database tables:', tables)

      // 确保用户目录存在
      const userDataPath = await this.ensureUserDirectory(userId)
      
      const exportedFiles: string[] = []
      const errors: string[] = []

      // 导出每个表的数据
      for (const tableName of tables) {
        try {
          console.log(`Exporting table: ${tableName}`)
          const tableData = await this.exportTableData(tableName)
          
          // 生成文件路径
          const fileName = `${tableName}.json`
          const filePath = `${userDataPath}/${fileName}`
          
          // 创建数据包装对象
          const dataPackage = {
            tableName: tableName,
            exportTime: new Date().toISOString(),
            recordCount: tableData.length,
            data: tableData
          }
          
          // 上传到OneDrive
          await this.uploadJsonFile(filePath, dataPackage)
          exportedFiles.push(filePath)
          
        } catch (error) {
          const errorMsg = `Failed to export table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }

      // 生成并上传元数据文件
      const metadata = this.generateMetadata(userId, tables)
      const metadataPath = `${userDataPath}/export_metadata.json`
      
      try {
        await this.uploadJsonFile(metadataPath, metadata)
        exportedFiles.push(metadataPath)
      } catch (error) {
        errors.push(`Failed to upload metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      return {
        success: errors.length === 0,
        exportedFiles,
        errors,
        metadata
      }

    } catch (error) {
      console.error('Export failed:', error)
      return {
        success: false,
        exportedFiles: [],
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        metadata: this.generateMetadata(userId, [])
      }
    }
  }

  // 导出特定表
  async exportTable(tableName: string, userId: string): Promise<ExportResult> {
    try {
      if (!microsoftAuth.isLoggedIn()) {
        throw new Error('User not authenticated with OneDrive')
      }

      const userDataPath = await this.ensureUserDirectory(userId)
      const tableData = await this.exportTableData(tableName)
      
      const fileName = `${tableName}.json`
      const filePath = `${userDataPath}/${fileName}`

      const dataPackage = {
        dbName: adminService.getDBName(),
        tableName: tableName,
        exportTime: new Date().toISOString(),
        syncTime: new Date().toISOString(),
        recordCount: tableData.length,
        data: tableData
      }
      
      await this.uploadJsonFile(filePath, dataPackage)
      
      const metadata = this.generateMetadata(userId, [tableName])
      
      return {
        success: true,
        exportedFiles: [filePath],
        errors: [],
        metadata
      }

    } catch (error) {
      console.error(`Failed to export table ${tableName}:`, error)
      return {
        success: false,
        exportedFiles: [],
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        metadata: this.generateMetadata(userId, [])
      }
    }
  }

  // 获取导出历史
  async getExportHistory(userId: string): Promise<ExportMetadata[]> {
    const graphClient = microsoftAuth.getGraphClient()
    if (!graphClient) {
      throw new Error('Graph client not initialized')
    }

    try {
      const userDataPath = `${this.APP_FOLDER_PATH}/users/${userId}/data`
      const files = await graphClient.api(`/me/drive/root:/${userDataPath}:/children`).get()
      
      const metadataFiles = files.value.filter((file: any) => 
        file.name.includes('export_metadata') && file.name.endsWith('.json')
      )
      
      const history: ExportMetadata[] = []
      
      for (const file of metadataFiles) {
        try {
          const content = await graphClient.api(`/me/drive/items/${file.id}/content`).get()
          const metadata = JSON.parse(content)
          history.push(metadata)
        } catch (error) {
          console.error(`Failed to read metadata file ${file.name}:`, error)
        }
      }
      
      return history.sort((a, b) => new Date(b.exportTime).getTime() - new Date(a.exportTime).getTime())
      
    } catch (error) {
      console.error('Failed to get export history:', error)
      return []
    }
  }

  // 从OneDrive读取users.json文件
  async readUsersFileOrig(): Promise<any> {
    const graphClient = microsoftAuth.getGraphClient()
    if (!graphClient) {
      throw new Error('Graph client not initialized')
    }

    try {
      if (!microsoftAuth.isLoggedIn()) {
        throw new Error('User not authenticated with OneDrive')
      }

      const filePath = `${this.APP_FOLDER_PATH}/users.json`
      
      // 获取文件元数据
      const fileMetadata = await graphClient
        .api(`/me/drive/root:/${filePath}`)
        .get()

      // 下载文件内容
      const content = await graphClient
        .api(`/me/drive/items/${fileMetadata.id}/content`)
        .get()

      // 解析JSON内容
      const data = typeof content === 'string' ? JSON.parse(content) : content
      
      console.log('Successfully read users.json file')
      return data

    } catch (error) {
      if (error instanceof Error) {
        // 检查是否是文件不存在的错误
        if (error.message.includes('404') || error.message.includes('NotFound')) {
          console.warn('users.json file not found on OneDrive')
          return null
        }
        console.error('Failed to read users.json file:', error.message)
      } else {
        console.error('Failed to read users.json file:', error)
      }
      throw error
    }
  }


  // 从OneDrive读取users.json文件
  async readUsersFile(): Promise<any> {
    //   if (!state.isAuthenticated) {
    //   console.warn('OneDrive not connected')
    //   setState(prev => ({ ...prev, error: '未连接到OneDrive' }))
    //   return
    // }

    try {
      console.log('Reading users.json file from OneDrive...')
      const graphClient = microsoftAuth.getGraphClient()!
      if (!graphClient) {
        throw new Error('Graph client not initialized')
      }

      if (!microsoftAuth.isLoggedIn()) {
        throw new Error('User not authenticated with OneDrive')
      }

      const filePath = `${this.APP_FOLDER_PATH}/users.json`
      
      // 获取文件元数据
      const fileMetadata = await graphClient
        .api(`/me/drive/root:/${filePath}`)
        .get()

      // 下载文件内容
      // const content = await graphClient
      //   .api(`/me/drive/items/${fileMetadata.id}/content`)
      //   .get()

      // const accessToken = microsoftAuth.getAuthState()!.accessToken
      // const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileMetadata.id}/content`, {
      //   headers: {
      //     'Authorization': `Bearer ${accessToken}`,
      //   }
      // })

      // 使用更安全的方式获取文件内容，尝试刷新令牌
      const accessToken = await microsoftAuth.getTokenSilently()
      if (!accessToken) {
        throw new Error('No valid access token available. Please re-authenticate.')
      }
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileMetadata.id}/content`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      })

      // console.log('Response status:', response.status)
      // console.log('response:', response)
      // const data = typeof content === 'string' ? JSON.parse(content) : content
      
      const jsonString = await response.text(); // 👈 这里拿到原始 JSON 字符串
      // 如果你需要解析成对象，可以再用 JSON.parse
      const data = JSON.parse(jsonString);
      // console.log(`File content: ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`);
      console.log('Successfully read users.json file')
      return data;
    } catch (error) {
      if (error instanceof Error) {
        // 检查是否是文件不存在的错误
        if (error.message.includes('404') || error.message.includes('NotFound')) {
          console.warn('users.json file not found on OneDrive')
          return null
        }
        console.error('Failed to read users.json file:', error.message)
      } else {
        console.error('Failed to read users.json file:', error)
      }
      throw error
    }
  }

  // 从OneDrive读取json文件
  async readFile(fileName: string): Promise<any> {
    const graphClient = microsoftAuth.getGraphClient()
    if (!graphClient) {
      throw new Error('Graph client not initialized')
    }

    try {
      if (!microsoftAuth.isLoggedIn()) {
        throw new Error('User not authenticated with OneDrive')
      }
      const defaultReturnData = {
        "dbName": "HealthCalendarDB",
        "tableName": fileName.replace('.json', ''),
        "data": []
      }
      const filePath = `${this.APP_FOLDER_PATH}/${fileName}`

      
      // 获取文件元数据
      let fileMetadata: any
      try {
        fileMetadata = await graphClient
          .api(`/me/drive/root:/${filePath}`)
          .get();
        // console.log('found file:', fileMetadata);

      // if (fileMetadata?.fileName !== fileName) {
      //   // throw new Error(`${fileName} file not found on OneDrive`)
      //   return defaultReturnData
      // }

      } catch (err: any) {
        if (err.statusCode === 404) {
          console.log(`${fileName} file not found!`);
          return defaultReturnData
        } else {
          console.error(`Failed to read ${fileName} file:`, err);
        }
      }


      // 下载文件内容
      // const content = await graphClient
      //   .api(`/me/drive/items/${fileMetadata.id}/content`)
      //   .get()
      // 使用更安全的方式获取令牌，自动刷新过期令牌
      const accessToken = await microsoftAuth.getTokenSilently()
      if (!accessToken) {
        throw new Error('No valid access token available. Please re-authenticate.')
      }
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileMetadata.id}/content`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      })
      // console.log('Response status:', response.status)
      // console.log('response:', response)
      // const data = typeof content === 'string' ? JSON.parse(content) : content
      
      const jsonString = await response.text(); // 👈 这里拿到原始 JSON 字符串
      // 如果你需要解析成对象，可以再用 JSON.parse
      const data = JSON.parse(jsonString);
      // console.log(`File content: ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`);
      console.log(`Successfully read ${fileName} file`)
      return data;
    } catch (error) {
      if (error instanceof Error) {
        // 检查是否是文件不存在的错误
        if (error.message.includes('404') || error.message.includes('NotFound')) {
          console.warn(`${fileName} file not found on OneDrive`)
          return null
        }
        console.error(`Failed to read ${fileName} file error message:`, error.message)
      } else {
        console.error(`Failed to read ${fileName} file error:`, error)
      }
      throw error
    }
  }

  async syncFromOneDrive(): Promise<{ success: boolean }> {
    try {
      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Syncing from OneDrive...')      

      const userDataPath = `${this.APP_FOLDER_PATH}`
      const fileMetadata = await graphClient
      .api(`/me/drive/root:/${userDataPath}/users.json`)
      .get();

      console.log(`File metadata: ${JSON.stringify(fileMetadata, null, 2)}`)

            // 获取文件内容
      const content = await graphClient.api(`/me/drive/items/${fileMetadata.id}/content`).get()
      // console.log(`File content: ${typeof content === 'string' ? content : JSON.stringify(content, null, 2)}`)
      
      // const dataPackage = typeof content === 'string' ? JSON.parse(content) : content

      // console.log('Data package:', dataPackage)
      return { success: true }
    } catch (error) {
      console.error('Sync failed:', error)
      return { success: false } 
    }
  }

  /**
   * 读取 OneDrive 上 Apps/HealthCalendar/users.json 文件
   */
  async readusers(): Promise<any | null> {
    const graphClient = microsoftAuth.getGraphClient();
    if (!graphClient) {
      throw new Error('Graph client not initialized');
    }

    try {
      if (!microsoftAuth.isLoggedIn()) {
        throw new Error('User not authenticated with OneDrive');
      }

console.log('microsoftAuth', microsoftAuth)

      const filePath = 'Apps/HealthCalendar/users.json';

      // 获取文件元数据
      const fileMetadata = await graphClient
        .api(`/me/drive/root:/${filePath}`)
        .get();

      console.log(`File metadata: ${JSON.stringify(fileMetadata, null, 2)}`);
      // 下载文件内容
      const content = await graphClient
        .api(`/me/drive/items/${fileMetadata.id}/content`)
        .get();
      // console.log(`File content: ${typeof content === 'string' ? content : JSON.stringify(content, null, 2)}`);
      // 解析JSON内容
      const data = typeof content === 'string' ? JSON.parse(content) : content;

      console.log('Successfully read users.json file');
      return data;
} catch (error: any) {
  console.error('Graph error details:', {
    status: error.statusCode,
    code: error.code,
    message: error.message,
    body: error.body,
  });
  throw error;
}
  }
  
  async importAllTables(userId: string): Promise<{ success: boolean; importedTables: string[]; errors: string[] }> {
    const importedTables: string[] = []
    const errors: string[] = []

    try {
      console.log('Starting import process...')
      
      // 首先检查OneDrive连接性
      const connectivity = await this.checkOneDriveConnectivity()
      if (!connectivity.connected) {
        errors.push(`OneDrive connection failed: ${connectivity.error}`)
        return { success: false, importedTables, errors }
      }

      // 确保应用文件夹存在
      const appFolderReady = await this.ensureAppFolder()
      if (!appFolderReady) {
        errors.push('Failed to access or create app folder on OneDrive')
        return { success: false, importedTables, errors }
      }

      const graphClient = microsoftAuth.getGraphClient()!
      console.log('Importing all tables from OneDrive...')

      // 获取用户数据目录
      const userDataPath = `${this.APP_FOLDER_PATH}`
      
      try {
        // 获取数据目录中的所有文件
        const files = await graphClient.api(`/me/drive/root:/${userDataPath}:/children`).get()
        
        // 只导入 .json 文件且不是 metadata
        const dataFiles = files.value.filter((file: any) =>
          file.name.endsWith('.json') && !file.name.includes('export_metadata')
        )

        console.log(`Found ${dataFiles.length} data files to import`)

        if (dataFiles.length === 0) {
          errors.push('No data files found on OneDrive. Please export data first.')
          return { success: false, importedTables, errors }
        }

        for (const file of dataFiles) {
          try {
            console.log(`Importing file: ${file.name}`)
            
            // 获取文件内容
            const content = await graphClient.api(`/me/drive/items/${file.id}/content`).get()
            const dataPackage = typeof content === 'string' ? JSON.parse(content) : content
            
            if (!dataPackage.tableName || !Array.isArray(dataPackage.data)) {
              errors.push(`Invalid data format in file: ${file.name}`)
              continue
            }

            const { tableName, data } = dataPackage

            // 导入到 IndexedDB
            // await this.importTableData(tableName, data)
            importedTables.push(tableName)
            console.log(`Successfully imported table: ${tableName} with ${data.length} records`)
            
          } catch (error) {
            const errorMsg = `Failed to import file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error(errorMsg)
            errors.push(errorMsg)
          }
        }

      } catch (error) {
        // 如果目录不存在或其他错误
        if (error instanceof Error && (error.message.includes('404') || error.message.includes('NotFound'))) {
          errors.push('No data directory found on OneDrive. Please export data first.')
        } else {
          errors.push(`Failed to access OneDrive directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

    } catch (error) {
      const errorMsg = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      errors.push(errorMsg)
    }

    return {
      success: errors.length === 0,
      importedTables,
      errors
    }
  }

  // 导入单个表的数据到IndexedDB
  private async importTableData(tableName: string, data: any[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('HealthCalendarDB')
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // 检查表是否存在
        if (!db.objectStoreNames.contains(tableName)) {
          db.close()
          reject(new Error(`Table ${tableName} does not exist in local database`))
          return
        }

        const transaction = db.transaction([tableName], 'readwrite')
        const store = transaction.objectStore(tableName)
        
        // 清空表
        const clearReq = store.clear()
        
        clearReq.onsuccess = () => {
          // 批量写入数据
          let addCount = 0
          const totalRecords = data.length
          
          if (totalRecords === 0) {
            // 如果没有数据，直接完成
            db.close()
            resolve()
            return
          }

          for (const record of data) {
            const addReq = store.add(record)
            
            addReq.onsuccess = () => {
              addCount++
              if (addCount === totalRecords) {
                db.close()
                resolve()
              }
            }
            
            addReq.onerror = () => {
              db.close()
              reject(new Error(`Failed to add record to table ${tableName}`))
            }
          }
        }
        
        clearReq.onerror = () => {
          db.close()
          reject(new Error(`Failed to clear table ${tableName}`))
        }
      }
      
      request.onerror = () => {
        reject(new Error('Failed to open database'))
      }
    })
  }

  // 从OneDrive导入用户数据
  async importUsersFromOneDrive(): Promise<{ 
    success: boolean; 
    importedCount: number; 
    errors: string[] 
  }> {
    try {
      console.log('Starting users import from OneDrive...')
      
      // 从OneDrive读取users.json文件
      // const oneDriveUsers = await this.readUsersFile()
      const oneDriveUsers = await this.readFile('users.json')
      
      if (!oneDriveUsers) {
        return {
          success: false,
          importedCount: 0,
          errors: ['OneDrive上未找到users.json文件']
        }
      }

      // 确保数据格式正确
      const usersArray = Array.isArray(oneDriveUsers) ? oneDriveUsers : 
                        (oneDriveUsers.data && Array.isArray(oneDriveUsers.data)) ? oneDriveUsers.data : []

      if (usersArray.length === 0) {
        return {
          success: true,
          importedCount: 0,
          errors: ['OneDrive文件中未找到用户数据']
        }
      }

      console.log(`Found ${usersArray.length} users in OneDrive file`)

      // 获取本地现有用户数据
      // const localUsers = await userDB.getAllUsers()
      const localUsers = await adminService.getAllUsersRecord()
      console.log(`Found ${localUsers.length} local users`)

      let importedCount = 0
      const errors: string[] = []

      // 合并用户数据
      for (const oneDriveUser of usersArray) {
        try {
          // 验证必要字段
          console.log(`Processing user: ${JSON.stringify(oneDriveUser)}`)
          if (!oneDriveUser.id || !oneDriveUser.updatedAt) {
            console.warn(`用户数据格式错误: ${JSON.stringify(oneDriveUser)}`)
            errors.push(`用户数据格式错误: ${JSON.stringify(oneDriveUser)}`)
            continue
          }

          // 查找本地是否存在相同ID的用户
          const existingUser = localUsers.find(user => user.id === oneDriveUser.id)
          console.log(`Processing user: ${oneDriveUser.id}, existing: ${!!existingUser}`)

          if (!existingUser) {
            // 本地不存在，直接添加
            try {
              const newUser = {
                id: oneDriveUser.id,
                name: oneDriveUser.name || 'Unknown',
                avatarUrl: oneDriveUser.avatarUrl || '',
                isActive: oneDriveUser.isActive !== undefined ? oneDriveUser.isActive : false,
                createdAt: oneDriveUser.createdAt || new Date().toISOString(),
                updatedAt: oneDriveUser.updatedAt
              }
              
              // 直接使用IndexedDB添加完整的用户对象
              await this.addUserDirectly(newUser)
              
              importedCount++
              console.log(`Added new user: ${oneDriveUser.id}`)
            } catch (addError) {
              errors.push(`添加用户失败 ${oneDriveUser.id}: ${addError instanceof Error ? addError.message : 'Unknown error'}`)
            }
          } else {
            // 本地存在，比较updatedAt时间戳
            const oneDriveDate = new Date(oneDriveUser.updatedAt)
            const localDate = new Date(existingUser.updatedAt)

            if (oneDriveDate > localDate) {
              // OneDrive数据更新，更新本地数据
              try {
                const updatedUser = {
                  ...oneDriveUser
                }
                
                // 直接使用IndexedDB更新完整的用户对象
                await this.updateUserDirectly(updatedUser)
                
                importedCount++
                console.log(`Updated user: ${oneDriveUser.id} (OneDrive newer: ${oneDriveUser.updatedAt} > ${existingUser.updatedAt})`)
              } catch (updateError) {
                errors.push(`更新用户失败 ${oneDriveUser.id}: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`)
              }
            } else {
              console.log(`Skipped user: ${oneDriveUser.id} (Local newer or same: ${existingUser.updatedAt} >= ${oneDriveUser.updatedAt})`)
            }
          }
        } catch (error) {
          errors.push(`处理用户数据失败 ${oneDriveUser.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      console.log(`Import completed. Imported: ${importedCount}, Errors: ${errors.length}`)

      return {
        // success: errors.length === 0 || importedCount > 0,
        success: true,
        importedCount,
        errors
      }

    } catch (error) {
      console.error('Import users from OneDrive failed:', error)
      return {
        success: false,
        importedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // 从OneDrive导入用户数据
  async importMyRecordsFromOneDrive(): Promise<{ 
    success: boolean; 
    importedCount: number; 
    errors: string[] 
  }> {
    try {
      console.log('Starting import MyRecords from OneDrive...')

      // 从OneDrive读取myRecords.json文件
      const oneDriveFile = await this.readFile('myRecords.json')
      // console.log('oneDriveFile:', oneDriveFile)

      if (!oneDriveFile) {
        return {
          success: false,
          importedCount: 0,
          errors: ['OneDrive上未找到myRecords.json文件']
        }
      }

      // 确保数据格式正确
      const dataArray = (oneDriveFile.data && Array.isArray(oneDriveFile.data)) ? oneDriveFile.data : []

      if (dataArray.length === 0) {
        return {
          success: true,
          importedCount: 0,
          errors: ['OneDrive文件中未找到用户数据']
        }
      }

      console.log(`Found ${dataArray.length} data in OneDrive file`)

      // 获取本地现有用户数据
      // const localUsers = await userDB.getAllUsers()
      const localRecords = await adminService.getAllRecordsIDB('myRecords')
      console.log(`Found ${localRecords.length} local recoreds`)

      let importedCount = 0
      const errors: string[] = []

      // 合并用户数据
      for (const oneDriveRecord of dataArray) {
        try {
          // 验证必要字段
          // console.log(`Processing record: ${JSON.stringify(oneDriveRecord)}`)
          console.log(`Processing record: ${oneDriveRecord.id}`)
          if (!oneDriveRecord.id || !oneDriveRecord.updatedAt) {
            console.warn(`用户数据格式错误: ${JSON.stringify(oneDriveRecord)}`)
            errors.push(`用户数据格式错误: ${JSON.stringify(oneDriveRecord)}`)
            continue
          }

          // 查找本地是否存在相同ID的用户
          const existingRecord = localRecords.find(record => record.id === oneDriveRecord.id)

          if (!existingRecord) {
            console.log(`Processing record: ${oneDriveRecord.id}, existing: ${!!existingRecord}`)
            // 本地不存在，直接添加
              const newRecord = {
                ...oneDriveRecord
              }
            try {

              
              // 直接使用IndexedDB添加完整的用户对象
              await this.addMyRecordDirectly(newRecord)
              
              importedCount++
              console.log(`Added new user: ${newRecord.id}`)
            } catch (addError) {
              console.error(`添加用户失败 ${newRecord.id}:`, addError)
              errors.push(`添加失败 ${newRecord.id}: ${addError instanceof Error ? addError.message : 'Unknown error'}`)
            }
          } else {
            // 本地存在，比较updatedAt时间戳
            console.log(`Processing record: ${oneDriveRecord.id}, existing: ${!!existingRecord}`)
            const oneDriveDate = new Date(oneDriveRecord.updatedAt)
            const localDate = new Date(existingRecord.updatedAt)

            if (oneDriveDate > localDate) {
              // OneDrive数据更新，更新本地数据
                const updatedRecord = {
                  ...oneDriveRecord,
                }
                
              try {

                // 直接使用IndexedDB更新完整的用户对象
                await this.updateMyRecordDirectly(updatedRecord)
                
                importedCount++
                console.log(`Updated user: ${oneDriveRecord.id} (OneDrive newer: ${oneDriveRecord.updatedAt} > ${existingRecord.updatedAt})`)
              } catch (updateError) {
                console.error(`更新用户失败 ${oneDriveRecord.id}:`, updateError)
                errors.push(`更新用户失败 ${oneDriveRecord.id}: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`)
              }
            } else {
              console.log(`Skipped user: ${oneDriveRecord.id} (Local newer or same: ${existingRecord.updatedAt} >= ${oneDriveRecord.updatedAt})`)
            }
          }
        } catch (error) {
          console.error(`处理用户数据失败 ${oneDriveRecord.id}:`, error)
          errors.push(`处理用户数据失败 ${oneDriveRecord.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      console.log(`Import completed. Imported: ${importedCount}, Errors: ${errors.length}`)

      return {
        success: errors.length === 0 || importedCount > 0,
        importedCount,
        errors
      }

    } catch (error) {
      console.error('Import users from OneDrive failed:', error)
      return {
        success: false,
        importedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // 直接添加用户到IndexedDB（包含所有字段）
  private async addUserDirectly(user: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HealthCalendarDB')
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction(['users'], 'readwrite')
        const store = transaction.objectStore('users')
        const addRequest = store.add(user)
        
        addRequest.onsuccess = () => {
          // db.close()
          resolve()
        }
        
        addRequest.onerror = () => {
          // db.close()
          console.error('Failed to add user directly:', addRequest.error)
          reject(new Error('Failed to add user directly'))
        }
      }
      
      request.onerror = () => {
        console.error('Failed to open database:', request.error)
        reject(new Error('Failed to open database'))
      }
    })
  }

  // 直接更新用户到IndexedDB（包含所有字段）
  private async updateUserDirectly(user: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HealthCalendarDB')
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction(['users'], 'readwrite')
        const store = transaction.objectStore('users')
        const putRequest = store.put(user)
        
        putRequest.onsuccess = () => {
          // db.close()
          resolve()
        }
        
        putRequest.onerror = () => {
          // db.close()
          console.error('Failed to update user directly:', putRequest.error)
          reject(new Error('Failed to update user directly'))
        }
      }
      
      request.onerror = () => {
        console.error('Failed to open database:', request.error)
        reject(new Error('Failed to open database'))
      }
    })
  }

  // 直接添加用户到IndexedDB（包含所有字段）
  private async addMyRecordDirectly(record: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HealthCalendarDB')
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction(['myRecords'], 'readwrite')
        const store = transaction.objectStore('myRecords')
        const addRequest = store.add(record)
        
        addRequest.onsuccess = () => {
          // db.close()
          resolve()
        }
        
        addRequest.onerror = () => {
          // db.close()
          console.error('Failed to add MyRecord directly:', addRequest.error)
          reject(new Error('Failed to add MyRecord directly'))
        }
      }
      
      request.onerror = () => {
        console.error('Failed to open database:', request.error)
        reject(new Error('Failed to open database'))
      }
    })
  }

  // 直接更新用户到IndexedDB（包含所有字段）
  private async updateMyRecordDirectly(record: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HealthCalendarDB')
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction(['myRecords'], 'readwrite')
        const store = transaction.objectStore('myRecords')
        const putRequest = store.put(record)
        
        putRequest.onsuccess = () => {
          // db.close()
          // console.log('MyRecord updated successfully:', record.id)
          resolve()
        }
        
        putRequest.onerror = () => {
          // db.close()
          console.error('Failed to update MyRecord directly:', putRequest.error)
          reject(new Error('Failed to update MyRecord directly'))
        }
      }
      
      request.onerror = () => {
        console.error('Failed to open database:', request.error)
        reject(new Error('Failed to open database'))
      }
    })
  }

  // 直接添加用户到IndexedDB（包含所有字段）
  private async addStoolRecordDirectly(record: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HealthCalendarDB')
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction(['stoolRecords'], 'readwrite')
        const store = transaction.objectStore('stoolRecords')
        const addRequest = store.add(record)
        
        addRequest.onsuccess = () => {
          // db.close()
          resolve()
        }
        
        addRequest.onerror = () => {
          // db.close()
          console.error('Failed to add MyRecord directly:', addRequest.error)
          reject(new Error('Failed to add MyRecord directly'))
        }
      }
      
      request.onerror = () => {
        console.error('Failed to open database:', request.error)
        reject(new Error('Failed to open database'))
      }
    })
  }

  // 直接更新用户到IndexedDB（包含所有字段）
  private async updateStoolRecordDirectly(record: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HealthCalendarDB')
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction(['stoolRecords'], 'readwrite')
        const store = transaction.objectStore('stoolRecords')
        const putRequest = store.put(record)
        
        putRequest.onsuccess = () => {
          // db.close()
          // console.log('MyRecord updated successfully:', record.id)
          resolve()
        }
        
        putRequest.onerror = () => {
          // db.close()
          console.error('Failed to update MyRecord directly:', putRequest.error)
          reject(new Error('Failed to update MyRecord directly'))
        }
      }
      
      request.onerror = () => {
        console.error('Failed to open database:', request.error)
        reject(new Error('Failed to open database'))
      }
    })
  }

  // 从OneDrive导入用户数据
  async importStoolRecordsFromOneDrive(): Promise<{ 
    success: boolean; 
    importedCount: number; 
    errors: string[] 
  }> {
    try {
      console.log('Starting import StoolRecords from OneDrive...')

      // 从OneDrive读取myRecords.json文件
      const oneDriveFile = await this.readFile('stoolRecords.json')

      if (!oneDriveFile) {
        return {
          success: false,
          importedCount: 0,
          errors: ['OneDrive上未找到stoolRecords.json文件']
        }
      }

      // 确保数据格式正确
      const dataArray = (oneDriveFile.data && Array.isArray(oneDriveFile.data)) ? oneDriveFile.data : []

      if (dataArray.length === 0) {
        return {
          success: true,
          importedCount: 0,
          errors: ['OneDrive文件中未找到用户数据']
        }
      }

      console.log(`Found ${dataArray.length} data in OneDrive file`)

      // 获取本地现有用户数据
      // const localUsers = await userDB.getAllUsers()
      const localRecords = await adminService.getAllRecordsIDB('stoolRecords')
      console.log(`Found ${localRecords.length} local recoreds`)

      let importedCount = 0
      const errors: string[] = []

      // 合并用户数据
      for (const oneDriveRecord of dataArray) {
        try {
          // 验证必要字段
          // console.log(`Processing record: ${JSON.stringify(oneDriveRecord)}`)
          console.log(`Processing record: ${oneDriveRecord.id}`)
          if (!oneDriveRecord.id || !oneDriveRecord.updatedAt) {
            console.warn(`用户数据格式错误: ${JSON.stringify(oneDriveRecord)}`)
            errors.push(`用户数据格式错误: ${JSON.stringify(oneDriveRecord)}`)
            continue
          }

          // 查找本地是否存在相同ID的用户
          const existingRecord = localRecords.find(record => record.id === oneDriveRecord.id)

          if (!existingRecord) {
            console.log(`Processing record: ${oneDriveRecord.id}, existing: ${!!existingRecord}`)
            // 本地不存在，直接添加
              const newRecord = {
                ...oneDriveRecord
              }
            try {

              
              // 直接使用IndexedDB添加完整的用户对象
              await this.addStoolRecordDirectly(newRecord)
              
              importedCount++
              console.log(`Added new user: ${newRecord.id}`)
            } catch (addError) {
              console.error(`添加用户失败 ${newRecord.id}:`, addError)
              errors.push(`添加失败 ${newRecord.id}: ${addError instanceof Error ? addError.message : 'Unknown error'}`)
            }
          } else {
            // 本地存在，比较updatedAt时间戳
            console.log(`Processing record: ${oneDriveRecord.id}, existing: ${!!existingRecord}`)
            const oneDriveDate = new Date(oneDriveRecord.updatedAt)
            const localDate = new Date(existingRecord.updatedAt)

            if (oneDriveDate > localDate) {
              // OneDrive数据更新，更新本地数据
                const updatedRecord = {
                  ...oneDriveRecord,
                }
                
              try {

                // 直接使用IndexedDB更新完整的用户对象
                await this.updateStoolRecordDirectly(updatedRecord)
                
                importedCount++
                console.log(`Updated user: ${oneDriveRecord.id} (OneDrive newer: ${oneDriveRecord.updatedAt} > ${existingRecord.updatedAt})`)
              } catch (updateError) {
                console.error(`更新用户失败 ${oneDriveRecord.id}:`, updateError)
                errors.push(`更新用户失败 ${oneDriveRecord.id}: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`)
              }
            } else {
              console.log(`Skipped user: ${oneDriveRecord.id} (Local newer or same: ${existingRecord.updatedAt} >= ${oneDriveRecord.updatedAt})`)
            }
          }
        } catch (error) {
          console.error(`处理用户数据失败 ${oneDriveRecord.id}:`, error)
          errors.push(`处理用户数据失败 ${oneDriveRecord.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      console.log(`Import completed. Imported: ${importedCount}, Errors: ${errors.length}`)

      return {
        success: errors.length === 0 || importedCount > 0,
        importedCount,
        errors
      }

    } catch (error) {
      console.error('Import users from OneDrive failed:', error)
      return {
        success: false,
        importedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  public mergeRecords = (existing: any[], incoming: any[]): any[] => {
    const merged: { [key: string]: any } = {}

    // 合并现有记录
    existing.forEach(record => {
      merged[record.id] = record
    })

    // 合并新记录
    incoming.forEach(record => {
      if (merged[record.id]) {
        // 如果存在，比较updatedAt时间戳
        const existingDate = new Date(merged[record.id].updatedAt)
        const incomingDate = new Date(record.updatedAt)

        if (incomingDate > existingDate) {
          // 如果新记录更新，则替换
          merged[record.id] = record
        }
      } else {
        // 如果不存在，直接添加
        merged[record.id] = record
      }
    })

    return Object.values(merged)
  }
}

// 单例实例
export const dataExportService = new DataExportService()
