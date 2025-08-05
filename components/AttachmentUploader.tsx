import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, File, Image, AlertCircle, Download, Trash2 } from 'lucide-react'
import { Attachment, AttachmentUploadState, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE, MAX_ATTACHMENTS_PER_RECORD } from '../types/attachment'

interface AttachmentUploaderProps {
  oneDriveConnected: boolean
  onConnect: () => void
  attachments: Attachment[]
  onAttachmentsChange: (attachments: Attachment[]) => void
  onUpload: (file: File, recordType: string, recordId: string) => Promise<string>
  onDelete: (fileName: string) => Promise<void>
  onGetUrl: (fileName: string) => Promise<string>
  recordType: string
  recordId: string
  disabled?: boolean
  compressImages?: boolean
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  oneDriveConnected,
  onConnect,
  attachments,
  onAttachmentsChange,
  onUpload,
  onDelete,
  onGetUrl,
  recordType,
  recordId,
  disabled = false,
  compressImages = true
}) => {
  const [uploadState, setUploadState] = useState<AttachmentUploadState>({
    isUploading: false,
    progress: 0,
    error: null
  })
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 图片压缩函数
  const compressImage = useCallback((file: File, quality: number = 0.8, maxWidth: number = 1920, maxHeight: number = 1080): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        console.error('Canvas context not available, skipping compression')
        resolve(file)
        return
      }
      
      const img = document.createElement('img')
      
      img.onload = () => {
        try {
          // 计算新的尺寸
          let { width, height } = img
          const originalWidth = width
          const originalHeight = height
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = Math.floor(width * ratio)
            height = Math.floor(height * ratio)
          }
          
          canvas.width = width
          canvas.height = height
          
          // 绘制压缩后的图片
          ctx.drawImage(img, 0, 0, width, height)
          
          // 转换为Blob
          canvas.toBlob((blob) => {
            if (blob) {
              // 创建新的File对象
              const compressedFile = new (window as any).File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              
              console.log(`📷 图片压缩完成: ${file.name}`)
              console.log(`📐 原始尺寸: ${originalWidth}x${originalHeight}`)
              console.log(`📐 压缩尺寸: ${width}x${height}`)
              console.log(`📦 原始大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
              console.log(`📦 压缩后大小: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
              console.log(`💾 压缩率: ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`)
              
              // 清理临时URL
              URL.revokeObjectURL(img.src)
              
              resolve(compressedFile)
            } else {
              console.error('Canvas toBlob failed, using original file')
              URL.revokeObjectURL(img.src)
              resolve(file)
            }
          }, file.type, quality)
        } catch (error) {
          console.error('Image compression error:', error)
          URL.revokeObjectURL(img.src)
          resolve(file)
        }
      }
      
      img.onerror = () => {
        console.error('Image load error for file:', file.name)
        URL.revokeObjectURL(img.src)
        resolve(file)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }, [])

  // 预处理文件（可能包含压缩）
  const preprocessFile = useCallback(async (file: File): Promise<File> => {
    // 检查是否是图片且需要压缩
    if (compressImages && file.type.startsWith('image/')) {
      try {
        return await compressImage(file)
      } catch (error) {
        console.error('图片压缩失败，使用原始文件:', error)
        return file
      }
    }
    
    return file
  }, [compressImages, compressImage])

  // 验证单个文件
  const validateFile = (file: File, currentAttachmentCount: number): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `文件"${file.name}"大小不能超过 ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`
    }

    if (currentAttachmentCount >= MAX_ATTACHMENTS_PER_RECORD) {
      return `每个记录最多只能上传 ${MAX_ATTACHMENTS_PER_RECORD} 个附件`
    }

    return null
  }

  // 验证多个文件
  const validateFiles = (files: FileList): { validFiles: File[], errors: string[] } => {
    const validFiles: File[] = []
    const errors: string[] = []
    let currentCount = attachments.length

    // 首先检查总数量限制
    if (currentCount + files.length > MAX_ATTACHMENTS_PER_RECORD) {
      errors.push(`选择的文件过多。当前已有 ${currentCount} 个附件，最多只能再上传 ${MAX_ATTACHMENTS_PER_RECORD - currentCount} 个`)
      return { validFiles: [], errors }
    }

    // 逐个验证文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const error = validateFile(file, currentCount + validFiles.length)
      
      if (error) {
        errors.push(error)
      } else {
        validFiles.push(file)
      }
    }

    return { validFiles, errors }
  }

  // 处理多文件上传
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!oneDriveConnected) {
      setUploadState(prev => ({ ...prev, error: '需要先连接OneDrive才能上传附件' }))
      return
    }

    if (files.length === 0) return

    console.log(`🔄 开始处理多文件上传: ${files.length} 个文件`)

    // 验证所有文件
    const { validFiles, errors } = validateFiles(files)
    
    if (errors.length > 0) {
      setUploadState(prev => ({ ...prev, error: errors.join('; ') }))
      return
    }

    if (validFiles.length === 0) {
      setUploadState(prev => ({ ...prev, error: '没有有效的文件可以上传' }))
      return
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      error: null
    })

    const newAttachments: Attachment[] = []
    const totalFiles = validFiles.length
    let completedFiles = 0

    try {
      console.log(`📋 开始批量上传 ${totalFiles} 个文件`)

      // 批量处理所有文件
      for (let i = 0; i < validFiles.length; i++) {
        const originalFile = validFiles[i]
        
        console.log(`🔄 处理文件 ${i + 1}/${totalFiles}: ${originalFile.name}`)
        console.log(`📝 文件信息 - 大小: ${(originalFile.size / 1024 / 1024).toFixed(2)}MB, 类型: ${originalFile.type}`)

        try {
          // 预处理文件（可能包含压缩）
          console.log(`🔧 预处理文件 - 压缩选项: ${compressImages ? '启用' : '禁用'}`)
          const processedFile = await preprocessFile(originalFile)
          
          console.log(`✅ 文件预处理完成`)
          console.log(`📝 处理后文件信息 - 大小: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`)

          console.log(`⬆️ 开始上传到OneDrive: ${originalFile.name}`)
          const fileName = await onUpload(processedFile, recordType, recordId)

          // 创建新的附件对象
          const newAttachment: Attachment = {
            id: `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`,
            fileName,
            originalName: originalFile.name,
            fileSize: processedFile.size,
            mimeType: originalFile.type,
            uploadedAt: new Date().toISOString(),
            isUploaded: true
          }

          newAttachments.push(newAttachment)
          completedFiles++

          // 更新进度
          const progress = Math.floor((completedFiles / totalFiles) * 100)
          setUploadState(prev => ({
            ...prev,
            progress
          }))

          console.log(`🎉 文件上传成功 ${completedFiles}/${totalFiles}: ${originalFile.name}`)

        } catch (fileError) {
          console.error(`❌ 文件上传失败: ${originalFile.name}`, fileError)
          // 继续处理其他文件，不中断整个过程
        }
      }

      // 更新附件列表
      if (newAttachments.length > 0) {
        const updatedAttachments = [...attachments, ...newAttachments]
        onAttachmentsChange(updatedAttachments)
      }

      setUploadState({
        isUploading: false,
        progress: 100,
        error: completedFiles === 0 ? '所有文件上传失败' : 
               completedFiles < totalFiles ? `部分文件上传成功 (${completedFiles}/${totalFiles})` : null
      })

      console.log(`🏁 批量上传完成: ${completedFiles}/${totalFiles} 个文件成功`)

    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : '批量上传失败'
      })
      console.error('❌ 批量上传失败:', error)
    }
  }, [oneDriveConnected, attachments, onUpload, onAttachmentsChange, recordType, recordId, validateFiles, preprocessFile, compressImages])

  // 处理删除附件
  const handleDeleteAttachment = useCallback(async (attachment: Attachment) => {
    if (!confirm(`确定要删除附件 "${attachment.originalName}" 吗？`)) {
      return
    }

    try {
      await onDelete(attachment.fileName)
      
      // 从列表中移除
      const updatedAttachments = attachments.filter(a => a.id !== attachment.id)
      onAttachmentsChange(updatedAttachments)
      
      console.log('附件删除成功:', attachment.originalName)
    } catch (error) {
      console.error('删除附件失败:', error)
      alert('删除附件失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }, [attachments, onDelete, onAttachmentsChange])

  // 处理下载附件
  const handleDownloadAttachment = useCallback(async (attachment: Attachment) => {
    try {
      const downloadUrl = await onGetUrl(attachment.fileName)
      
      // 创建临时链接并下载
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = attachment.originalName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('开始下载附件:', attachment.originalName)
    } catch (error) {
      console.error('下载附件失败:', error)
      alert('下载附件失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }, [onGetUrl])

  // 拖拽事件处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    if (disabled || !oneDriveConnected) return
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [disabled, oneDriveConnected, handleFileUpload])

  // 文件选择事件处理
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
    // 清除input值，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFileUpload])

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // 获取文件图标
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-4 h-4 text-blue-500" />
    }
    return <File className="w-4 h-4 text-gray-500" />
  }

  if (!oneDriveConnected) {
    console.log('⚠️ AttachmentUploader: OneDrive未连接，显示连接提示')
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-3">需要连接OneDrive才能上传附件</p>
        <p className="text-xs text-gray-500 mb-3">附件将安全存储在您的OneDrive云端</p>
        <button
          onClick={onConnect}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          连接OneDrive
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={SUPPORTED_FILE_TYPES.all.join(',')}
          onChange={handleFileSelect}
          disabled={disabled}
          multiple
        />
        
        {uploadState.isUploading ? (
          <div className="space-y-2">
            <Upload className="w-6 h-6 text-blue-500 mx-auto animate-pulse" />
            <p className="text-sm text-gray-600">正在批量上传文件...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">上传进度: {uploadState.progress}%</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-6 h-6 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-600">
              拖拽文件到此处或点击选择多个文件
            </p>
            <p className="text-xs text-gray-500">
              支持同时上传多个文件，每个文件最大 {(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB，最多 {MAX_ATTACHMENTS_PER_RECORD} 个附件
            </p>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {uploadState.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-700">{uploadState.error}</p>
            <button
              onClick={() => setUploadState(prev => ({ ...prev, error: null }))}
              className="text-xs text-red-600 hover:text-red-800 mt-1"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 附件列表 */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">已上传的附件 ({attachments.length})</h4>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(attachment.mimeType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.fileSize)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadAttachment(attachment)}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAttachment(attachment)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AttachmentUploader
