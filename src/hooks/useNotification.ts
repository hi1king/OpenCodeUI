// ============================================
// useNotification - 浏览器通知
// ============================================
//
// 当 AI 完成回复且页面不在前台时，发送浏览器通知
// 点击通知可以跳转到对应 session

import { useState, useCallback, useEffect, useRef } from 'react'
import { STORAGE_KEY_NOTIFICATIONS_ENABLED } from '../constants/storage'

// ============================================
// Types
// ============================================

interface NotificationData {
  sessionId: string
  directory?: string
}

// ============================================
// Hook
// ============================================

export function useNotification() {
  const [enabled, setEnabledState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_NOTIFICATIONS_ENABLED) === 'true'
    } catch {
      return false
    }
  })

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof Notification === 'undefined') return 'denied'
    return Notification.permission
  })

  // 跟踪最新的 enabled 值，供 sendNotification 闭包使用
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  // 切换通知开关
  const setEnabled = useCallback(async (value: boolean) => {
    if (value && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      // 首次启用时请求权限
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        // 用户拒绝了权限，不启用
        return
      }
    }

    setEnabledState(value)
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY_NOTIFICATIONS_ENABLED, 'true')
      } else {
        localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS_ENABLED)
      }
    } catch { /* ignore */ }
  }, [])

  // 发送通知
  const sendNotification = useCallback((title: string, body: string, data?: NotificationData) => {
    if (!enabledRef.current) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    // 页面在前台时不发通知
    if (document.hasFocus()) return

    try {
      const notification = new Notification(title, {
        body,
        icon: '/opencode.svg',
        tag: data?.sessionId || 'opencode', // 同 session 的通知会替换
      })

      notification.onclick = () => {
        window.focus()
        // 跳转到对应 session
        if (data?.sessionId) {
          const path = `#/session/${data.sessionId}`
          const dir = data.directory ? `?dir=${data.directory}` : ''
          window.location.hash = `${path}${dir}`
        }
        notification.close()
      }
    } catch {
      // 通知 API 可能在某些环境不可用
    }
  }, [])

  const supported = typeof Notification !== 'undefined'

  return {
    enabled,
    setEnabled,
    permission,
    supported,
    sendNotification,
  }
}
