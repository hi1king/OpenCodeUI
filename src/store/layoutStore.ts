// ============================================
// LayoutStore - 全局 UI 布局状态
// ============================================

type Subscriber = () => void

// 浮动窗口位置和尺寸
export interface FloatingPanelState {
  sessionId: string
  x: number
  y: number
  width: number
  height: number
  isMinimized: boolean
}

// 默认浮动窗口配置
const DEFAULT_PANEL_WIDTH = 480
const DEFAULT_PANEL_HEIGHT = 500
const MIN_PANEL_WIDTH = 320
const MIN_PANEL_HEIGHT = 300

class LayoutStore {
  private subscribers = new Set<Subscriber>()
  
  // State
  private floatingPanel: FloatingPanelState | null = null

  // ============================================
  // Subscription
  // ============================================

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }

  private notify() {
    this.subscribers.forEach(fn => fn())
  }

  // ============================================
  // Actions
  // ============================================

  // 打开浮动窗口
  openFloatingPanel(sessionId: string) {
    // 如果已经打开同一个 session，不做任何事
    if (this.floatingPanel?.sessionId === sessionId) return
    
    // 计算初始位置（屏幕右下角，留一些边距）
    const x = Math.max(100, window.innerWidth - DEFAULT_PANEL_WIDTH - 40)
    const y = Math.max(100, window.innerHeight - DEFAULT_PANEL_HEIGHT - 80)
    
    this.floatingPanel = {
      sessionId,
      x,
      y,
      width: DEFAULT_PANEL_WIDTH,
      height: DEFAULT_PANEL_HEIGHT,
      isMinimized: false,
    }
    this.notify()
  }

  // 关闭浮动窗口
  closeFloatingPanel() {
    if (!this.floatingPanel) return
    this.floatingPanel = null
    this.notify()
  }

  // 最小化/恢复
  toggleMinimize() {
    if (!this.floatingPanel) return
    this.floatingPanel = {
      ...this.floatingPanel,
      isMinimized: !this.floatingPanel.isMinimized,
    }
    this.notify()
  }

  // 更新位置
  setPosition(x: number, y: number) {
    if (!this.floatingPanel) return
    this.floatingPanel = { ...this.floatingPanel, x, y }
    this.notify()
  }

  // 更新尺寸
  setSize(width: number, height: number) {
    if (!this.floatingPanel) return
    this.floatingPanel = {
      ...this.floatingPanel,
      width: Math.max(MIN_PANEL_WIDTH, width),
      height: Math.max(MIN_PANEL_HEIGHT, height),
    }
    this.notify()
  }

  // 放大（变成更大的窗口，但不是全屏）
  expandPanel() {
    if (!this.floatingPanel) return
    const expandedWidth = Math.min(700, window.innerWidth - 100)
    const expandedHeight = Math.min(600, window.innerHeight - 150)
    const x = (window.innerWidth - expandedWidth) / 2
    const y = (window.innerHeight - expandedHeight) / 2
    
    this.floatingPanel = {
      ...this.floatingPanel,
      x,
      y,
      width: expandedWidth,
      height: expandedHeight,
      isMinimized: false,
    }
    this.notify()
  }

  // ============================================
  // Getters
  // ============================================

  getFloatingPanel() {
    return this.floatingPanel
  }

  // 兼容旧 API
  getActiveSubSessionId() {
    return this.floatingPanel?.sessionId || null
  }

  // 兼容旧 API
  setActiveSubSessionId(id: string | null) {
    if (id) {
      this.openFloatingPanel(id)
    } else {
      this.closeFloatingPanel()
    }
  }
}

export const layoutStore = new LayoutStore()

// ============================================
// Snapshot Cache
// ============================================

interface LayoutSnapshot {
  floatingPanel: FloatingPanelState | null
  // 兼容旧 API
  activeSubSessionId: string | null
}

let cachedSnapshot: LayoutSnapshot | null = null

function getSnapshot(): LayoutSnapshot {
  if (!cachedSnapshot) {
    const panel = layoutStore.getFloatingPanel()
    cachedSnapshot = {
      floatingPanel: panel,
      activeSubSessionId: panel?.sessionId || null,
    }
  }
  return cachedSnapshot
}

// Clear cache on update
layoutStore.subscribe(() => {
  cachedSnapshot = null
})

// ============================================
// React Hook
// ============================================

import { useSyncExternalStore } from 'react'

export function useLayoutStore() {
  return useSyncExternalStore(
    (cb) => layoutStore.subscribe(cb),
    getSnapshot,
    getSnapshot
  )
}
