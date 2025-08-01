import React from 'react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { AlertTriangle, Info } from 'lucide-react'

interface OneDriveCompatibilityAlertProps {
  isAvailable: boolean
  unavailabilityReason: string | null
  className?: string
}

export const OneDriveCompatibilityAlert: React.FC<OneDriveCompatibilityAlertProps> = ({
  isAvailable,
  unavailabilityReason,
  className
}) => {
  if (isAvailable) {
    return null
  }

  return (
    <Alert className={className} variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>OneDrive同步不可用</AlertTitle>
      <AlertDescription className="whitespace-pre-line">
        {unavailabilityReason || '您的浏览器不支持OneDrive同步功能'}
        {'\n\n'}
        <strong>您仍然可以正常使用健康日历的核心功能：</strong>
        {'\n'}• 记录和查看健康数据
        {'\n'}• 使用日历界面
        {'\n'}• 管理用户档案
        {'\n'}• 所有数据将保存在本地浏览器中
      </AlertDescription>
    </Alert>
  )
}

export default OneDriveCompatibilityAlert