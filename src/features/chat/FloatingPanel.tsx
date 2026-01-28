import { useRef, useEffect, useCallback, useState } from 'react'
import { ChatArea } from './ChatArea'
import { InputBox } from './InputBox'
import { useSessionManager } from '../../hooks'
import { CloseIcon, ExpandIcon, MinimizeIcon } from '../../components/Icons'
import { useRouter } from '../../hooks/useRouter'
import { useSessionState, messageStore, layoutStore, useLayoutStore } from '../../store'
import { sendMessage, abortSession, type Attachment } from '../../api'

// ============================================
// FloatingPanel - 可拖拽、可调整大小的浮动窗口
// ============================================

export function FloatingPanel() {
  const { floatingPanel } = useLayoutStore()
  const { navigateToSession } = useRouter()
  
  // 不存在或没有 sessionId 时不渲染
  if (!floatingPanel) return null
  
  const { sessionId, x, y, width, height, isMinimized } = floatingPanel

  // 如果最小化，渲染为角落的小指示器
  if (isMinimized) {
    return <MinimizedIndicator sessionId={sessionId} />
  }

  return (
    <FloatingPanelContent
      sessionId={sessionId}
      x={x}
      y={y}
      width={width}
      height={height}
      navigateToSession={navigateToSession}
    />
  )
}

// ============================================
// 最小化状态的指示器
// ============================================

function MinimizedIndicator({ sessionId }: { sessionId: string }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 bg-bg-200 border border-border-200 rounded-full shadow-lg cursor-pointer hover:bg-bg-300 transition-colors"
      onClick={() => layoutStore.toggleMinimize()}
    >
      <div className="w-2 h-2 rounded-full bg-accent-main-100 animate-pulse" />
      <span className="text-xs text-text-200 font-medium">Subtask</span>
      <span className="text-[10px] text-text-400 font-mono">{sessionId.slice(0, 6)}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          layoutStore.closeFloatingPanel()
        }}
        className="ml-1 p-0.5 text-text-400 hover:text-text-100 transition-colors"
      >
        <CloseIcon size={12} />
      </button>
    </div>
  )
}

// ============================================
// 完整的浮动面板内容
// ============================================

interface FloatingPanelContentProps {
  sessionId: string
  x: number
  y: number
  width: number
  height: number
  navigateToSession: (id: string) => void
}

function FloatingPanelContent({ 
  sessionId, x, y, width, height, navigateToSession 
}: FloatingPanelContentProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 })
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  
  // 获取 session 数据
  const sessionState = useSessionState(sessionId)
  const messages = sessionState?.messages || []
  const isStreaming = sessionState?.isStreaming || false
  const isLoading = sessionState?.loadState === 'loading'
  const canUndo = sessionState?.canUndo || false
  
  // Session 操作
  const { handleUndo } = useSessionManager({ sessionId })

  // 发送消息
  const handleSendMessage = useCallback(async (text: string, attachments: Attachment[]) => {
    messageStore.truncateAfterRevert(sessionId)
    messageStore.setStreaming(sessionId, true)
    
    try {
      const lastMsg = [...messages].reverse().find(m => 'model' in m.info || 'modelID' in m.info)
      const lastInfo = lastMsg?.info as any
      const model = lastInfo?.model || (lastInfo?.modelID ? { providerID: lastInfo.providerID, modelID: lastInfo.modelID } : { providerID: 'openai', modelID: 'gpt-4o' })
      
      await sendMessage({
        sessionId,
        text,
        attachments,
        model
      })
    } catch (error) {
      console.error('Failed to send message to sub-session:', error)
      messageStore.setStreaming(sessionId, false)
    }
  }, [sessionId, messages])

  const handleStop = useCallback(() => {
    abortSession(sessionId)
  }, [sessionId])

  // ============================================
  // 拖拽逻辑
  // ============================================

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // 只允许从 header 区域开始拖拽
    if ((e.target as HTMLElement).closest('button')) return
    
    e.preventDefault()
    dragStartRef.current = { x: e.clientX, y: e.clientY, panelX: x, panelY: y }
    setIsDragging(true)
  }, [x, y])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      const newX = Math.max(0, Math.min(window.innerWidth - 100, dragStartRef.current.panelX + deltaX))
      const newY = Math.max(0, Math.min(window.innerHeight - 50, dragStartRef.current.panelY + deltaY))
      layoutStore.setPosition(newX, newY)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging])

  // ============================================
  // 调整大小逻辑
  // ============================================

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeStartRef.current = { x: e.clientX, y: e.clientY, width, height }
    setIsResizing(true)
  }, [width, height])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartRef.current.x
      const deltaY = e.clientY - resizeStartRef.current.y
      const newWidth = resizeStartRef.current.width + deltaX
      const newHeight = resizeStartRef.current.height + deltaY
      layoutStore.setSize(newWidth, newHeight)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'nwse-resize'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isResizing])

  // ============================================
  // 操作按钮
  // ============================================

  const handleClose = () => layoutStore.closeFloatingPanel()
  const handleMinimize = () => layoutStore.toggleMinimize()
  const handleExpand = () => layoutStore.expandPanel()
  
  const handleFullScreen = () => {
    layoutStore.closeFloatingPanel()
    navigateToSession(sessionId)
  }

  return (
    <div
      ref={panelRef}
      className={`fixed z-50 flex flex-col bg-bg-100 border border-border-200 rounded-xl shadow-2xl overflow-hidden ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      style={{
        left: x,
        top: y,
        width,
        height,
      }}
    >
      {/* Header - 可拖拽区域 */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-bg-200/80 border-b border-border-200 cursor-grab select-none flex-shrink-0"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-2 h-2 rounded-full bg-accent-main-100 animate-pulse flex-shrink-0" />
          <span className="text-xs font-medium text-text-200 truncate">Subtask</span>
          <span className="text-[10px] text-text-400 font-mono opacity-60">{sessionId.slice(0, 8)}</span>
        </div>
        
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={handleMinimize}
            className="p-1.5 text-text-400 hover:text-text-100 hover:bg-bg-300 rounded transition-colors"
            title="Minimize"
          >
            <MinimizeIcon size={12} />
          </button>
          <button
            onClick={handleExpand}
            className="p-1.5 text-text-400 hover:text-text-100 hover:bg-bg-300 rounded transition-colors"
            title="Expand"
          >
            <ExpandIcon size={12} />
          </button>
          <button
            onClick={handleFullScreen}
            className="p-1.5 text-text-400 hover:text-text-100 hover:bg-bg-300 rounded transition-colors"
            title="Open full session"
          >
            <ExternalLinkIcon size={12} />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 text-text-400 hover:text-danger-100 hover:bg-danger-100/10 rounded transition-colors"
            title="Close"
          >
            <CloseIcon size={12} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 overflow-hidden bg-bg-000">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-400 text-sm">
            Loading...
          </div>
        ) : (
          <ChatArea 
            messages={messages} 
            sessionId={sessionId} 
            isStreaming={isStreaming}
            onUndo={handleUndo}
            canUndo={canUndo}
            isWideMode={false}
          />
        )}
      </div>

      {/* Input Area */}
      <div className="p-2 border-t border-border-200 bg-bg-100 flex-shrink-0">
        <InputBox 
          onSend={handleSendMessage} 
          onAbort={handleStop}
          isStreaming={isStreaming}
        />
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize group"
        onMouseDown={handleResizeStart}
      >
        <svg
          className="absolute bottom-1 right-1 w-2.5 h-2.5 text-text-500 group-hover:text-text-300 transition-colors"
          viewBox="0 0 10 10"
        >
          <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

// ============================================
// Icons
// ============================================

function ExternalLinkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}
