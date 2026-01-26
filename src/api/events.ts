// ============================================
// Global Event Subscription (SSE) - Enhanced Version
// ============================================

import {
  API_BASE,
  type ApiMessageWithParts,
  type ApiPart,
  type ApiSession,
  type ApiPermissionRequest,
  type PermissionReply,
  type ApiQuestionRequest,
  type GlobalEvent,
  type EventCallbacks,
} from './types'

// ============================================
// Connection State
// ============================================

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface ConnectionInfo {
  state: ConnectionState
  lastEventTime: number
  reconnectAttempt: number
  error?: string
}

// 全局连接状态（可以被外部订阅）
let connectionInfo: ConnectionInfo = {
  state: 'disconnected',
  lastEventTime: 0,
  reconnectAttempt: 0,
}

const connectionListeners = new Set<(info: ConnectionInfo) => void>()

function updateConnectionState(update: Partial<ConnectionInfo>) {
  connectionInfo = { ...connectionInfo, ...update }
  connectionListeners.forEach(fn => fn(connectionInfo))
}

export function getConnectionInfo(): ConnectionInfo {
  return connectionInfo
}

export function subscribeToConnectionState(fn: (info: ConnectionInfo) => void): () => void {
  connectionListeners.add(fn)
  // 立即发送当前状态
  fn(connectionInfo)
  return () => connectionListeners.delete(fn)
}

// ============================================
// SSE Subscription
// ============================================

const RECONNECT_DELAYS = [1000, 2000, 3000, 5000, 10000, 30000] // 递增重连延迟
const HEARTBEAT_TIMEOUT = 60000 // 60 秒没收到事件就认为连接断开

export function subscribeToEvents(callbacks: EventCallbacks): () => void {
  const controller = new AbortController()
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let isCleaningUp = false

  const resetHeartbeat = () => {
    if (heartbeatTimer) clearTimeout(heartbeatTimer)
    if (isCleaningUp) return
    
    updateConnectionState({ lastEventTime: Date.now() })
    
    heartbeatTimer = setTimeout(() => {
      if (isCleaningUp) return
      console.warn('[SSE] No events received for 60s, reconnecting...')
      updateConnectionState({ state: 'disconnected', error: 'Heartbeat timeout' })
      scheduleReconnect()
    }, HEARTBEAT_TIMEOUT)
  }

  const scheduleReconnect = () => {
    if (isCleaningUp) return
    if (reconnectTimer) clearTimeout(reconnectTimer)
    
    const attempt = connectionInfo.reconnectAttempt
    const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)]
    
    console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${attempt + 1})...`)
    
    reconnectTimer = setTimeout(() => {
      if (isCleaningUp) return
      updateConnectionState({ reconnectAttempt: attempt + 1 })
      connect()
    }, delay)
  }

  const connect = () => {
    if (isCleaningUp) return
    
    updateConnectionState({ state: 'connecting' })

    fetch(`${API_BASE}/global/event`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to subscribe: ${response.status}`)
        }

        // 连接成功，重置重连计数
        updateConnectionState({ 
          state: 'connected', 
          reconnectAttempt: 0,
          error: undefined 
        })
        resetHeartbeat()

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (!isCleaningUp) {
              console.log('[SSE] Stream ended, reconnecting...')
              updateConnectionState({ state: 'disconnected' })
              scheduleReconnect()
            }
            break
          }

          // 收到数据，重置心跳
          resetHeartbeat()

          buffer += decoder.decode(value, { stream: true })
          
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          let eventData = ''

          for (const line of lines) {
            if (line.startsWith('data:')) {
              eventData = line.slice(5).trim()
            } else if (line === '' && eventData) {
              try {
                const globalEvent = JSON.parse(eventData) as GlobalEvent
                handleGlobalEvent(globalEvent, callbacks)
              } catch (e) {
                console.error('[SSE] Failed to parse event:', e, eventData)
              }
              eventData = ''
            }
          }
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError' || isCleaningUp) {
          return
        }
        console.error('[SSE] Event stream error:', error)
        updateConnectionState({ 
          state: 'error', 
          error: error.message || 'Connection failed' 
        })
        callbacks.onError?.(error)
        scheduleReconnect()
      })
  }

  connect()

  return () => {
    isCleaningUp = true
    if (heartbeatTimer) clearTimeout(heartbeatTimer)
    if (reconnectTimer) clearTimeout(reconnectTimer)
    controller.abort()
    updateConnectionState({ state: 'disconnected' })
  }
}

// ============================================
// Event Handler
// ============================================

function handleGlobalEvent(
  globalEvent: GlobalEvent,
  callbacks: EventCallbacks
) {
  const { type, properties } = globalEvent.payload
  
  // Debug logging for all events
  console.log(`[SSE] Event received: ${type}`, properties)
  
  switch (type) {
    case 'message.updated': {
      const data = properties as { info: ApiMessageWithParts['info'] }
      callbacks.onMessageUpdated?.(data.info)
      break
    }
    case 'message.part.updated': {
      const data = properties as { part: ApiPart }
      callbacks.onPartUpdated?.(data.part)
      break
    }
    case 'message.part.removed':
      callbacks.onPartRemoved?.(properties as { id: string; messageID: string; sessionID: string })
      break
    case 'session.updated': {
      const data = properties as { info: ApiSession }
      callbacks.onSessionUpdated?.(data.info)
      break
    }
    case 'session.created': {
      const data = properties as { info: ApiSession }
      callbacks.onSessionCreated?.(data.info)
      break
    }
    case 'session.error':
      callbacks.onSessionError?.(properties as { sessionID: string; name: string; data: unknown })
      break
    case 'session.idle':
      callbacks.onSessionIdle?.(properties as { sessionID: string })
      break
    case 'permission.asked':
      callbacks.onPermissionAsked?.(properties as ApiPermissionRequest)
      break
    case 'permission.replied':
      callbacks.onPermissionReplied?.(properties as { sessionID: string; requestID: string; reply: PermissionReply })
      break
    case 'question.asked':
      callbacks.onQuestionAsked?.(properties as ApiQuestionRequest)
      break
    case 'question.replied':
      callbacks.onQuestionReplied?.(properties as { sessionID: string; requestID: string; answers: string[][] })
      break
    case 'question.rejected':
      callbacks.onQuestionRejected?.(properties as { sessionID: string; requestID: string })
      break
    default:
      // 忽略其他事件类型
      break
  }
}
