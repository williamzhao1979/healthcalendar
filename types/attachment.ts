// 附件类型定义
export interface Attachment {
  id: string              // 本地唯一ID
  fileName: string        // OneDrive中的完整文件名（包含前缀）
  originalName: string    // 用户原始文件名
  fileSize: number        // 文件大小（字节）
  mimeType: string        // 文件类型
  uploadedAt: string      // 上传时间
  isUploaded: boolean     // 是否上传成功
  downloadUrl?: string    // 下载链接（临时）
}

// 附件上传状态
export interface AttachmentUploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

// 支持的文件类型
export const SUPPORTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  all: ['image/*', 'application/pdf', 'text/*', '.doc', '.docx']
}

// 文件大小限制（10MB）
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// 每个记录最大附件数量
export const MAX_ATTACHMENTS_PER_RECORD = 5
