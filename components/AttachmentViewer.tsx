import React from 'react'
import { File, Image, Download, Paperclip } from 'lucide-react'
import { Attachment } from '../types/attachment'

interface AttachmentViewerProps {
  attachments: Attachment[]
  onDownload?: (attachment: Attachment) => void
  compact?: boolean
}

export const AttachmentViewer: React.FC<AttachmentViewerProps> = ({
  attachments,
  onDownload,
  compact = false
}) => {
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

  if (attachments.length === 0) {
    return null
  }

  if (compact) {
    // 紧凑模式 - 只显示附件图标和数量
    return (
      <div className="flex items-center space-x-1 text-xs text-gray-500">
        <Paperclip className="w-3 h-3" />
        <span>{attachments.length} 个附件</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h5 className="text-sm font-medium text-gray-700 flex items-center space-x-1">
        <Paperclip className="w-4 h-4" />
        <span>附件 ({attachments.length})</span>
      </h5>
      <div className="space-y-1">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {getFileIcon(attachment.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {attachment.originalName}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(attachment.fileSize)}
                </p>
              </div>
            </div>
            
            {onDownload && (
              <button
                onClick={() => onDownload(attachment)}
                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                title="下载"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default AttachmentViewer
