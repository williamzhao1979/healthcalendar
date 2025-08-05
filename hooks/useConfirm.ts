import { useState, useCallback } from 'react'
import { ConfirmType } from '../components/ConfirmDialog'

export interface ConfirmOptions {
  title: string
  message: string
  type?: ConfirmType
  confirmText?: string
  cancelText?: string
}

export interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    isLoading: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: '确定',
    cancelText: '取消',
    onConfirm: () => {},
    onCancel: () => {}
  })

  // 显示确认对话框
  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const handleConfirm = () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }))
        resolve(true)
      }

      const handleCancel = () => {
        setConfirmState(prev => ({ 
          ...prev, 
          isOpen: false, 
          isLoading: false 
        }))
        resolve(false)
      }

      setConfirmState({
        isOpen: true,
        isLoading: false,
        title: options.title,
        message: options.message,
        type: options.type || 'warning',
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        onConfirm: handleConfirm,
        onCancel: handleCancel
      })
    })
  }, [])

  // 关闭确认对话框
  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ 
      ...prev, 
      isOpen: false, 
      isLoading: false 
    }))
  }, [])

  // 设置加载状态
  const setLoading = useCallback((loading: boolean) => {
    setConfirmState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  // 便捷方法
  const confirmDelete = useCallback((itemName?: string) => {
    return showConfirm({
      title: '确认删除',
      message: itemName ? `确定要删除"${itemName}"吗？此操作无法撤销。` : '确定要删除此项目吗？此操作无法撤销。',
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消'
    })
  }, [showConfirm])

  const confirmDiscard = useCallback((formName?: string) => {
    return showConfirm({
      title: '确认放弃',
      message: formName ? `确定要关闭${formName}吗？未保存的更改将会丢失。` : '确定要关闭表单吗？未保存的更改将会丢失。',
      type: 'warning',
      confirmText: '放弃',
      cancelText: '继续编辑'
    })
  }, [showConfirm])

  const confirmAction = useCallback((title: string, message: string, actionName = '确定') => {
    return showConfirm({
      title,
      message,
      type: 'info',
      confirmText: actionName,
      cancelText: '取消'
    })
  }, [showConfirm])

  const showSuccess = useCallback((title: string, message: string) => {
    return showConfirm({
      title,
      message,
      type: 'success',
      confirmText: '好的',
      cancelText: '关闭'
    })
  }, [showConfirm])

  return {
    confirmState,
    showConfirm,
    closeConfirm,
    setLoading,
    // 便捷方法
    confirmDelete,
    confirmDiscard,
    confirmAction,
    showSuccess
  }
}

export default useConfirm