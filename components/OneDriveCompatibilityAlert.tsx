import React from 'react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { AlertTriangle, Info, Chrome, ExternalLink } from 'lucide-react'
import { MobileCompatibilityUtils } from '../lib/mobileCompatibility'

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

  const deviceInfo = typeof window !== 'undefined' 
    ? MobileCompatibilityUtils.detectDevice() 
    : { isAndroidEdge: false, isMobile: false, browserName: 'unknown' }

  const handleOpenInChrome = () => {
    const currentUrl = window.location.href
    const chromeUrl = `googlechrome://navigate?url=${encodeURIComponent(currentUrl)}`
    window.location.href = chromeUrl
    
    setTimeout(() => {
      alert('如果Chrome浏览器没有自动打开，请手动复制地址到Chrome浏览器中访问')
    }, 1000)
  }

  return (
    <Alert className={className} variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        OneDrive同步不可用
        {deviceInfo.isAndroidEdge && (
          <Badge variant="outline" className="text-xs">
            Mobile
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-4">
        <div>
          <p>{unavailabilityReason || '您的浏览器不支持OneDrive同步功能'}</p>
        </div>

        {/* Mobile特定提示 */}
        {deviceInfo.isAndroidEdge && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Mobile 兼容性提示：</p>
                <p>我们检测到您正在使用 Mobile 浏览器。由于浏览器兼容性限制，OneDrive 同步功能可能不稳定。为了获得最佳体验，强烈建议使用 Chrome 浏览器。</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="font-semibold">您仍然可以正常使用健康日历的核心功能：</p>
          <ul className="mt-2 space-y-1 ml-4 text-sm">
            <li className="list-disc">记录和查看健康数据</li>
            <li className="list-disc">使用日历界面</li>
            <li className="list-disc">管理用户档案</li>
            <li className="list-disc">所有数据将保存在本地浏览器中</li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2 pt-2">
          {deviceInfo.isAndroidEdge && (
            <Button
              onClick={handleOpenInChrome}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              <Chrome className="h-4 w-4" />
              在Chrome中打开
            </Button>
          )}
          
          <Button
            onClick={() => window.location.href = '/basic-test'}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            基础功能测试
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

export default OneDriveCompatibilityAlert