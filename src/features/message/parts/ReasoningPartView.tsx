import { memo, useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, LightbulbIcon, SpinnerIcon } from '../../../components/Icons'
import { ScrollArea } from '../../../components/ui'
import { useSmoothStream } from '../../../hooks/useSmoothStream'
import type { ReasoningPart } from '../../../types/message'

interface ReasoningPartViewProps {
  part: ReasoningPart
  isStreaming?: boolean
}

export const ReasoningPartView = memo(function ReasoningPartView({ part, isStreaming }: ReasoningPartViewProps) {
  // 跳过空的 reasoning
  // 只有当有实质内容时才渲染，即使正在 streaming 也不渲染空壳
  if (!part.text?.trim()) return null
  
  const isPartStreaming = isStreaming && !part.time?.end
  const hasContent = !!part.text?.trim()
  
  // 使用 smooth streaming 实现打字机效果
  const { displayText } = useSmoothStream(
    part.text || '',
    !!isPartStreaming,
    { charDelay: 6 }  // 稍快一点，因为是思考过程
  )
  const [expanded, setExpanded] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  // 自动控制展开状态
  useEffect(() => {
    if (isPartStreaming && hasContent) {
      // 流式传输中有内容时自动展开
      setExpanded(true)
    } else if (!isPartStreaming) {
      // 结束时自动折叠
      setExpanded(false)
    }
    // 注意：我们不处理 "流式中但无内容" 的情况，保持默认（折叠），避免空框
  }, [isPartStreaming, hasContent])

  // 滚动 ScrollArea 内部到底部
  // 使用 displayText 而不是 part.text，这样打字机效果时也会滚动
  useEffect(() => {
    if (isPartStreaming && expanded && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [displayText, isPartStreaming, expanded])

  return (
    <div className={`border border-border-300/20 rounded-xl overflow-hidden transition-all duration-300 ease-out -ml-3 ${
      expanded ? 'w-[calc(100%+1.5rem)]' : 'w-[260px]'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        disabled={!hasContent && !isPartStreaming} // 没内容且没流式时禁用点击（其实这种情况下组件都不渲染了）
        className={`w-full flex items-center gap-2 px-3 py-2 text-text-400 hover:bg-bg-200/50 transition-colors ${
          !hasContent ? 'cursor-default' : ''
        }`}
      >
        {isPartStreaming ? (
          <SpinnerIcon className="animate-spin" size={14} />
        ) : (
          <LightbulbIcon size={14} />
        )}
        <span className="text-xs font-medium whitespace-nowrap">
          {isPartStreaming ? 'Thinking...' : 'Thinking'}
        </span>
        {isPartStreaming && (
          <span className="flex gap-0.5 ml-1">
            <span className="w-1 h-1 bg-text-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 bg-text-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 bg-text-400 rounded-full animate-bounce" />
          </span>
        )}
        <span className={`ml-auto transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>
      
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${
        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}>
        <div className="overflow-hidden">
<ScrollArea ref={scrollAreaRef} maxHeight={192} className="border-t border-border-300/20 bg-bg-200/30">
                            <div className="px-3 py-2 text-text-300 text-xs font-mono whitespace-pre-wrap">
                              {displayText}
                            </div>
                          </ScrollArea>
        </div>
      </div>
    </div>
  )
})
