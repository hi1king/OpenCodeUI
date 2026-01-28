import { memo, useState } from 'react'
import { ChevronDownIcon } from '../../../components/Icons'
import { ContentBlock } from '../../../components'
import { getToolIcon } from '../../../utils/toolUtils'
import { detectLanguage } from '../../../utils/languageUtils'
import { useChildSessions, layoutStore, useSessionState } from '../../../store'
import type { ToolPart, Message, TextPart, ToolPart as ToolPartType } from '../../../types/message'

interface ToolPartViewProps {
  part: ToolPart
  isFirst?: boolean
  isLast?: boolean
}

// ============================================
// Helpers
// ============================================

function formatToolName(name: string): string {
  // Convert snake_case or kebab-case to Title Case
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export const ToolPartView = memo(function ToolPartView({ part, isFirst = false, isLast = false }: ToolPartViewProps) {
  const [expanded, setExpanded] = useState(() => {
    return part.state.status === 'running' || part.state.status === 'pending'
  })
  
  const { state, tool: toolName } = part
  const title = state.title || ''
  
  const duration = state.time?.start && state.time?.end 
    ? state.time.end - state.time.start 
    : undefined

  // Header height assumption: py-2 + line-height ~ 36px
  const headerHeightClass = "h-9" 
  
  // Status Color Logic
  const isActive = state.status === 'running' || state.status === 'pending'
  
  const getStatusClasses = () => {
    if (isActive) return 'text-accent-main-100'
    if (state.status === 'error') return 'text-danger-100'
    if (state.status === 'completed') return 'text-text-200 group-hover/header:text-text-100'
    return 'text-text-200 group-hover/header:text-text-100'
  }
  
  const statusClass = getStatusClasses()

  return (
    <div className="group relative flex">
      {/* Timeline Column */}
      <div className="w-10 shrink-0 relative flex flex-col items-center">
        {/* Line Up - 6px long */}
        {!isFirst && (
          <div className="absolute top-0 h-1.5 w-px bg-border-300/30" />
        )}
        
        {/* Line Down - start at 30px (18 + 12) */}
        {!isLast && (
          <div className="absolute top-[30px] bottom-0 w-px bg-border-300/30" />
        )}
        
        {/* Main Tool Icon Node - Center at 18px */}
        <div className="absolute top-[18px] -translate-y-1/2 z-10">
          <div className={`
            flex items-center justify-center transition-colors duration-200
            ${isActive ? 'text-accent-main-100 animate-pulse-slow' : ''}
            ${state.status === 'error' ? 'text-danger-100' : ''}
            ${state.status === 'completed' ? 'text-text-400 group-hover:text-text-300' : ''} 
          `}>
            {getToolIcon(toolName)}
          </div>
        </div>
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0 pb-1">
        {/* Header */}
        <button
          className={`flex items-center gap-3 w-full text-left px-3 hover:bg-bg-200/50 rounded-lg transition-colors group/header ${headerHeightClass}`}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <span className={`font-medium text-sm transition-colors ${statusClass}`}>
              {formatToolName(toolName)}
            </span>
            
            {title && (
              <span className="text-xs text-text-400 truncate font-mono opacity-80 max-w-[60%]">
                {title}
              </span>
            )}
          </div>
            
          <div className="flex items-center gap-3 ml-auto shrink-0">
            {duration !== undefined && state.status === 'completed' && (
              <span className="text-[10px] font-mono text-text-500 tabular-nums opacity-60">
                {formatDuration(duration)}
              </span>
            )}
            {isActive && (
              <span className="text-[10px] font-medium text-accent-main-100 animate-pulse-slow">
                Running...
              </span>
            )}
            {state.status === 'error' && (
              <span className="text-[10px] font-medium text-danger-100">
                Failed
              </span>
            )}
            <span className={`text-text-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              <ChevronDownIcon size={12} />
            </span>
          </div>
        </button>

        {/* Body */}
        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}>
          <div className="overflow-hidden">
            <div className="p-3">
              <ToolBody part={part} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// ============================================
// Tool Body
// ============================================

function ToolBody({ part }: ToolPartViewProps) {
  const { tool, state } = part
  const lowerTool = tool.toLowerCase()
  
  // Task 工具特殊渲染（子 agent）
  if (lowerTool === 'task') {
    return <TaskToolView part={part} />
  }
  
  // Todo 特殊渲染
  if (lowerTool.includes('todo')) {
    const todos = extractTodos(part)
    if (todos.length > 0) {
      return <TodoList todos={todos} />
    }
  }
  
  // 通用渲染
  const data = extractData(part)
  const isActive = state.status === 'running' || state.status === 'pending'
  const hasInput = !!data.input
  const hasError = !!data.error
  const hasOutput = !!(data.files || data.diff || data.output || data.exitCode !== undefined)
  
  // 是否显示 Input block（有 input 或正在等待 input）
  const showInput = hasInput || isActive
  // 是否显示 Output block（有 input 后才显示）
  const showOutput = hasInput && (hasOutput || hasError || isActive)
  
  return (
    <div className="flex flex-col gap-3">
      {/* Input - loading 状态在 ContentBlock 内部处理 */}
      {showInput && (
        <ContentBlock 
          label="Input"
          content={data.input || ''}
          language={data.inputLang}
          isLoading={isActive && !hasInput}
          loadingText=""
          // 如果 Input 内容过长，默认折叠
          defaultCollapsed={(data.input?.length || 0) > 1000}
        />
      )}
      
      {/* Output - loading/error 在 ContentBlock 内部处理 */}
      {showOutput && (
        hasError ? (
          <ContentBlock 
            label="Error"
            content={data.error || ''}
            variant="error"
          />
        ) : hasOutput ? (
          data.files ? (
            <div className="space-y-3">
              {data.files.map((file, idx) => (
                <ContentBlock 
                  key={idx}
                  label={formatToolName(tool) + ' Result'}
                  filePath={file.filePath}
                  // 优先用 diff 字符串，其次用 before/after 对象
                  diff={file.diff || (file.before !== undefined && file.after !== undefined ? { before: file.before, after: file.after } : undefined)}
                  language={detectLanguage(file.filePath)}
                />
              ))}
            </div>
          ) : data.diff ? (
            <ContentBlock 
              label="Output"
              filePath={data.filePath}
              diff={data.diff}
              language={data.outputLang}
            />
          ) : (
            <ContentBlock 
              label="Output"
              content={data.output}
              language={data.outputLang}
              filePath={data.filePath}
              stats={data.exitCode !== undefined ? { exit: data.exitCode } : undefined}
            />
          )
        ) : (
          <ContentBlock 
            label="Output"
            isLoading={isActive}
            loadingText="Running..."
          />
        )
      )}
    </div>
  )
}

// ============================================
// TodoList
// ============================================

interface TodoItem {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'high' | 'medium' | 'low'
}

function TodoList({ todos }: { todos: TodoItem[] }) {
  const [collapsed, setCollapsed] = useState(false)
  const completed = todos.filter(t => t.status === 'completed').length
  const total = todos.length
  
  return (
    <div className="border border-border-200/50 rounded-lg overflow-hidden bg-bg-100 text-xs">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-1.5 bg-bg-200/50 hover:bg-bg-200 cursor-pointer select-none transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-text-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}>
            <ChevronDownIcon />
          </span>
          <span className="text-text-300 font-medium font-mono">Tasks</span>
        </div>
        <span className="text-text-500 tabular-nums font-mono">{completed}/{total}</span>
      </div>
      
      {/* List - 使用 grid 实现平滑展开动画 */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
      }`}>
        <div className="overflow-hidden">
          <div className="divide-y divide-border-200/30">
            {todos.map(todo => (
              <div 
                key={todo.id}
                className={`flex items-start gap-2 px-3 py-2 ${
                  todo.status === 'completed' ? 'text-text-500' : 'text-text-200'
                }`}
              >
                <span className="shrink-0 mt-0.5">{getTodoIcon(todo.status)}</span>
                <span className={todo.status === 'completed' ? 'line-through' : ''}>
                  {todo.content}
                </span>
                {todo.priority === 'high' && todo.status !== 'completed' && (
                  <span className="text-[10px] text-warning-100 bg-warning-100/10 px-1 rounded ml-auto shrink-0">!</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function getTodoIcon(status: TodoItem['status']) {
  const size = 14
  const cls = {
    completed: 'text-accent-secondary-100',
    in_progress: 'text-accent-main-100',
    cancelled: 'text-text-500',
    pending: 'text-text-500',
  }[status]
  
  switch (status) {
    case 'completed':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={cls}><path d="M20 6L9 17l-5-5"/></svg>
    case 'in_progress':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
    case 'cancelled':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><path d="M18 6L6 18M6 6l12 12"/></svg>
    default:
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><circle cx="12" cy="12" r="10"/></svg>
  }
}

// ============================================
// Helpers
// ============================================

function extractTodos(part: ToolPart): TodoItem[] {
  const { state } = part
  const metadata = state.metadata as Record<string, unknown> | undefined
  const inputObj = state.input as Record<string, unknown> | undefined
  return (metadata?.todos as TodoItem[]) || (inputObj?.todos as TodoItem[]) || []
}

interface FileDiff {
  filePath: string
  diff?: string
  before?: string
  after?: string
  additions?: number
  deletions?: number
}

interface ExtractedData {
  input?: string
  inputLang?: string
  output?: string
  outputLang?: string
  error?: string
  diff?: { before: string; after: string } | string
  files?: FileDiff[]
  filePath?: string
  exitCode?: number
}

function extractData(part: ToolPart): ExtractedData {
  const { state, tool } = part
  const inputObj = state.input as Record<string, unknown> | undefined
  const metadata = state.metadata
  const lowerTool = tool.toLowerCase()
  
  const result: ExtractedData = {}
  
  // Input
  if (inputObj && Object.keys(inputObj).length > 0) {
    if (lowerTool === 'bash' && inputObj.command) {
      result.input = String(inputObj.command)
      result.inputLang = 'bash'
    } else {
      result.input = JSON.stringify(inputObj, null, 2)
      result.inputLang = 'json'
    }
  }
  
  // Error
  if (state.error) {
    if (typeof state.error === 'string') {
      result.error = state.error
    } else if (typeof state.error === 'object' && 'data' in state.error) {
      result.error = String(state.error.data) || state.error.name
    }
  }
  
  // FilePath
  if (metadata && typeof metadata.filepath === 'string') {
    result.filePath = metadata.filepath
  }
  if (!result.filePath && inputObj?.filePath) {
    result.filePath = String(inputObj.filePath)
  }
  
  // Exit code
  if (metadata && typeof metadata.exit === 'number') {
    result.exitCode = metadata.exit
  }
  
  // Diff / Files (from metadata)
  if (metadata) {
    // 优先 1: metadata.files (结构化多文件 diff)
    if (Array.isArray(metadata.files) && metadata.files.length > 0) {
      result.files = metadata.files.map((f: any) => ({
        filePath: f.filePath || f.file || 'unknown',
        diff: f.diff,
        before: f.before,
        after: f.after,
        additions: f.additions,
        deletions: f.deletions,
      }))
    }
    // 优先 2: unified diff 字符串
    else if (typeof metadata.diff === 'string') {
      result.diff = metadata.diff
    } 
    // 优先 3: legacy filediff 对象
    else if (metadata.filediff) {
      const fd = metadata.filediff as { before: string; after: string }
      result.diff = { before: fd.before, after: fd.after }
    }
  }
  
  // Output language
  if (result.filePath) {
    result.outputLang = detectLanguage(result.filePath)
  }
  
  // Output (不是 diff 时)
  // 注意：如果有了 files 或 diff，通常就不需要显示纯文本 output 了
  if (!result.files && !result.diff) {
    // 增强 Edit 工具的展示：如果 metadata 中没有 diff，尝试从 input 中构造
    if ((lowerTool === 'edit' || lowerTool === 'replace') && inputObj?.oldString && inputObj?.newString) {
      result.diff = {
        before: String(inputObj.oldString),
        after: String(inputObj.newString)
      }
    } 
    else if (state.output) {
      if (tool === 'read') {
        const str = String(state.output)
        const match = str.match(/<file[^>]*>([\s\S]*?)<\/file>/i)
        result.output = match ? match[1] : str
      } else if (tool === 'write' && inputObj?.content) {
        result.output = String(inputObj.content)
      } else {
        result.output = typeof state.output === 'string' 
          ? state.output 
          : JSON.stringify(state.output, null, 2)
      }
      
      // 推断语言
      if (!result.outputLang && result.output) {
        const trimmed = result.output.trim()
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          result.outputLang = 'json'
        }
      }
    }
  }
  
  return result
}

// ============================================
// Task Tool View (子 agent 特殊视图)
// ============================================

function TaskToolView({ part }: ToolPartViewProps) {
  const { state } = part
  const [isExpanded, setIsExpanded] = useState(false)
  
  // 从 input 中提取任务信息
  const input = state.input as Record<string, unknown> | undefined
  const description = input?.description as string || 'Subtask'
  const prompt = input?.prompt as string || ''
  const agentType = input?.subagent_type as string || 'general'
  
  // 获取子 session ID
  // 1. 优先从 metadata 中读取 (持久化存储，刷新后依然有效)
  const metadata = state.metadata as Record<string, unknown> | undefined
  const metadataSessionId = metadata?.sessionId as string | undefined
  
  // 2. 只有当 metadata 中没有时，才尝试用 store 查找 (实时创建时使用)
  const childSessions = useChildSessions(part.sessionID)
  const storeChildSession = childSessions.length > 0 
    ? childSessions.sort((a, b) => b.createdAt - a.createdAt)[0]
    : null
    
  const targetSessionId = metadataSessionId || storeChildSession?.id
  
  // 获取子 session 的消息（用于内联预览）
  const childSessionState = useSessionState(isExpanded ? targetSessionId ?? null : null)
  const childMessages = childSessionState?.messages || []
  
  const isActive = state.status === 'running' || state.status === 'pending'
  const isCompleted = state.status === 'completed'
  const isError = state.status === 'error'
  
  // 打开浮动窗口
  const handleOpenFloating = () => {
    if (targetSessionId) {
      layoutStore.openFloatingPanel(targetSessionId)
    }
  }
  
  // 切换内联展开
  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }
  
  return (
    <div className="flex flex-col gap-2">
      {/* 任务信息卡片 */}
      <div className="rounded-lg bg-bg-200/50 border border-border-200/40 overflow-hidden">
        {/* Header - 可点击展开 */}
        <div 
          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-bg-200/80 transition-colors"
          onClick={toggleExpand}
        >
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-main-100/10 flex items-center justify-center">
            <SubagentIcon className="w-3.5 h-3.5 text-accent-main-100" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-100">{agentType}</span>
              {isActive && (
                <span className="text-[10px] text-info-100 bg-info-100/10 px-1.5 py-0.5 rounded animate-pulse">
                  Running
                </span>
              )}
              {isCompleted && (
                <span className="text-[10px] text-success-100 bg-success-100/10 px-1.5 py-0.5 rounded">
                  Done
                </span>
              )}
              {isError && (
                <span className="text-[10px] text-danger-100 bg-danger-100/10 px-1.5 py-0.5 rounded">
                  Error
                </span>
              )}
            </div>
            <p className="text-xs text-text-300 mt-0.5">{description}</p>
          </div>
          
          {/* 展开/收起 + 弹出按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {targetSessionId && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenFloating()
                }}
                className="p-1.5 text-text-400 hover:text-accent-main-100 hover:bg-accent-main-100/10 rounded transition-colors"
                title="Open in floating window"
              >
                <PopoutIcon className="w-3.5 h-3.5" />
              </button>
            )}
            <span className={`text-text-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDownIcon size={14} />
            </span>
          </div>
        </div>
        
        {/* 展开的内容 */}
        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}>
          <div className="overflow-hidden">
            <div className="border-t border-border-200/40">
              {/* Prompt 预览 */}
              {prompt && (
                <div className="px-3 py-2 bg-bg-100/50">
                  <p className="text-[11px] text-text-500 mb-1">Prompt:</p>
                  <p className="text-xs text-text-300 whitespace-pre-wrap line-clamp-5">{prompt}</p>
                </div>
              )}
              
              {/* 子会话消息预览 */}
              {targetSessionId && (
                <SubSessionPreview 
                  messages={childMessages} 
                  isLoading={childSessionState?.loadState === 'loading'}
                  onOpenFloating={handleOpenFloating}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 如果完成了，显示 output */}
      {isCompleted && state.output !== undefined && state.output !== null ? (
        <ContentBlock
          label="Result"
          content={typeof state.output === 'string' ? state.output : JSON.stringify(state.output, null, 2)}
          defaultCollapsed={true}
        />
      ) : null}
      
      {/* 错误信息 */}
      {isError && state.error !== undefined && state.error !== null ? (
        <div className="p-3 rounded-lg bg-danger-100/10 border border-danger-100/30">
          <p className="text-xs text-danger-100">
            {typeof state.error === 'string' ? state.error : String(JSON.stringify(state.error))}
          </p>
        </div>
      ) : null}
    </div>
  )
}

// ============================================
// 子会话消息预览组件
// ============================================

interface SubSessionPreviewProps {
  messages: Message[]
  isLoading?: boolean
  onOpenFloating: () => void
}

function SubSessionPreview({ messages, isLoading, onOpenFloating }: SubSessionPreviewProps) {
  // 只显示最近几条消息的摘要
  const MAX_PREVIEW_MESSAGES = 3
  const recentMessages = messages.slice(-MAX_PREVIEW_MESSAGES)
  
  if (isLoading) {
    return (
      <div className="px-3 py-4 flex items-center justify-center">
        <span className="text-xs text-text-400">Loading messages...</span>
      </div>
    )
  }
  
  if (messages.length === 0) {
    return (
      <div className="px-3 py-4 flex items-center justify-center">
        <span className="text-xs text-text-400">No messages yet</span>
      </div>
    )
  }
  
  return (
    <div className="px-3 py-2 space-y-2">
      {/* 如果有更多消息，显示提示 */}
      {messages.length > MAX_PREVIEW_MESSAGES && (
        <div className="text-[10px] text-text-500 text-center py-1">
          ... {messages.length - MAX_PREVIEW_MESSAGES} more messages above
        </div>
      )}
      
      {/* 消息预览 */}
      {recentMessages.map((msg, idx) => (
        <MessagePreviewItem key={msg.info.id || idx} message={msg} />
      ))}
      
      {/* 查看完整会话按钮 */}
      <button
        onClick={onOpenFloating}
        className="w-full py-1.5 text-[11px] font-medium text-accent-main-100 hover:bg-accent-main-100/10 rounded transition-colors"
      >
        Open full session
      </button>
    </div>
  )
}

// 单条消息预览
function MessagePreviewItem({ message }: { message: Message }) {
  const { info, parts } = message
  const isUser = info.role === 'user'
  
  // 提取文本内容
  const textContent = parts
    .filter((p): p is TextPart => p.type === 'text')
    .map(p => p.text)
    .join('\n')
    .slice(0, 200)
  
  // 统计工具调用数量
  const toolCount = parts.filter((p): p is ToolPartType => p.type === 'tool').length
  
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : ''}`}>
      <div className={`max-w-[85%] px-2.5 py-1.5 rounded-lg text-xs ${
        isUser 
          ? 'bg-accent-main-100/10 text-text-100' 
          : 'bg-bg-200 text-text-200'
      }`}>
        {textContent ? (
          <p className="line-clamp-2 whitespace-pre-wrap">{textContent}</p>
        ) : toolCount > 0 ? (
          <p className="text-text-400 italic">{toolCount} tool call{toolCount > 1 ? 's' : ''}</p>
        ) : (
          <p className="text-text-500 italic">Empty message</p>
        )}
      </div>
    </div>
  )
}

// ============================================
// Icons for TaskToolView
// ============================================

function SubagentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function PopoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}