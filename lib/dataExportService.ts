import { userDB } from './userDatabase'
import { microsoftAuth } from './microsoftAuth'

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
    const dataDirPath = `${userDirPath}/data`

    try {
      // 确保应用根目录存在
      await microsoftAuth.ensureAppFolder()

      // 检查并创建users目录
      const usersExists = await this.checkFolderExists(`${this.APP_FOLDER_PATH}/users`)
      if (!usersExists) {
        await this.createFolder(this.APP_FOLDER_PATH, 'users')
        console.log('Created users directory')
      }

      // 检查并创建用户目录
      const userExists = await this.checkFolderExists(userDirPath)
      if (!userExists) {
        await this.createFolder(`${this.APP_FOLDER_PATH}/users`, userId)
        console.log(`Created user directory for: ${userId}`)
      }

      // 检查并创建data目录
      const dataExists = await this.checkFolderExists(dataDirPath)
      if (!dataExists) {
        await this.createFolder(userDirPath, 'data')
        console.log('Created data directory')
      }

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
        tableName: tableName,
        exportTime: new Date().toISOString(),
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
}

// 单例实例
export const dataExportService = new DataExportService()
