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
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // 计算新的尺寸
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }
        
        canvas.width = width
        canvas.height = height
        
        // 绘制压缩后的图片
        ctx?.drawImage(img, 0, 0, width, height)
        
        // 转换为Blob
        canvas.toBlob((blob) => {
          if (blob) {
            // 创建新的File对象
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            
            console.log(`图片压缩完成: ${file.name}`)
            console.log(`原始大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
            console.log(`压缩后大小: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
            console.log(`压缩率: ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`)
            
            resolve(compressedFile)
          } else {
            // 压缩失败，返回原文件
            resolve(file)
          }
        }, file.type, quality)
      }
      
      img.onerror = () => {
        // 加载失败，返回原文件
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

  // 验证文件
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `文件大小不能超过 ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`
    }

    if (attachments.length >= MAX_ATTACHMENTS_PER_RECORD) {
      return `每个记录最多只能上传 ${MAX_ATTACHMENTS_PER_RECORD} 个附件`
    }

    return null
  }

  // 处理文件上传
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!oneDriveConnected) {
      setUploadState(prev => ({ ...prev, error: '需要先连接OneDrive才能上传附件' }))
      return
    }

    const originalFile = files[0] // 暂时只支持单文件上传
    if (!originalFile) return

    const validationError = validateFile(originalFile)
    if (validationError) {
      setUploadState(prev => ({ ...prev, error: validationError }))
      return
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      error: null
    })

    try {
      // 预处理文件（可能包含压缩）
      const processedFile = await preprocessFile(originalFile)

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }))
      }, 100)

      const fileName = await onUpload(processedFile, recordType, recordId)

      clearInterval(progressInterval)

      // 创建新的附件对象
      const newAttachment: Attachment = {
        id: `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName,
        originalName: originalFile.name,
        fileSize: processedFile.size, // 使用处理后的文件大小
        mimeType: originalFile.type,
        uploadedAt: new Date().toISOString(),
        isUploaded: true
      }

      // 更新附件列表
      const updatedAttachments = [...attachments, newAttachment]
      onAttachmentsChange(updatedAttachments)

      setUploadState({
        isUploading: false,
        progress: 100,
        error: null
      })

      console.log('附件上传成功:', newAttachment)
    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : '上传失败'
      })
      console.error('附件上传失败:', error)
    }
  }, [oneDriveConnected, attachments, onUpload, onAttachmentsChange, recordType, recordId, validateFile, preprocessFile])

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
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-3">需要连接OneDrive才能上传附件</p>
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
        />
        
        {uploadState.isUploading ? (
          <div className="space-y-2">
            <Upload className="w-6 h-6 text-blue-500 mx-auto animate-pulse" />
            <p className="text-sm text-gray-600">正在上传...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">{uploadState.progress}%</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-6 h-6 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-600">
              拖拽文件到此处或点击上传
            </p>
            <p className="text-xs text-gray-500">
              支持图片、PDF、文档等格式，最大 {(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB
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
