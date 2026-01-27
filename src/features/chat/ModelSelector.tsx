/**
 * ModelSelector - 模型选择器组件
 * 
 * 特性：
 * - 完整的键盘导航（上下键、Enter、Escape）
 * - 按使用频率排序
 * - 搜索过滤
 * - 按 provider 分组显示
 * - 显示最近使用的模型
 */

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { ChevronDownIcon, SearchIcon } from '../../components/Icons'
import type { ModelInfo } from '../../api'
import {
  getModelKey,
  groupModelsByProvider,
  getRecentModels,
  recordModelUsage,
  type ModelGroup,
} from '../../utils/modelUtils'

interface ModelSelectorProps {
  models: ModelInfo[]
  selectedModelKey: string | null  // providerId:modelId 格式
  onSelect: (modelKey: string, model: ModelInfo) => void
  isLoading?: boolean
  disabled?: boolean
}

export const ModelSelector = memo(function ModelSelector({
  models,
  selectedModelKey,
  onSelect,
  isLoading = false,
  disabled = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 过滤模型
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models
    const query = searchQuery.toLowerCase()
    return models.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query) ||
      m.family.toLowerCase().includes(query) ||
      m.providerName.toLowerCase().includes(query)
    )
  }, [models, searchQuery])

  // 分组模型（按使用频率排序）
  const modelGroups = useMemo(() => 
    groupModelsByProvider(filteredModels),
    [filteredModels]
  )

  // 扁平化的模型列表（用于键盘导航）
  const flatModels = useMemo(() => 
    modelGroups.flatMap(g => g.models),
    [modelGroups]
  )

  // 最近使用的模型
  const recentModels = useMemo(() => 
    searchQuery ? [] : getRecentModels(models, 3),
    [models, searchQuery]
  )

  // 当前选中的模型
  const selectedModel = useMemo(() => {
    if (!selectedModelKey) return null
    return models.find(m => getModelKey(m) === selectedModelKey) ?? null
  }, [models, selectedModelKey])

  // 显示名称
  const displayName = selectedModel?.name || (isLoading ? 'Loading...' : 'Select model')
  const displayProvider = selectedModel?.providerName

  // 打开菜单
  const openMenu = useCallback(() => {
    if (disabled || isLoading) return
    setIsOpen(true)
    setSearchQuery('')
    setHighlightedIndex(0)
  }, [disabled, isLoading])

  // 关闭菜单
  const closeMenu = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
    triggerRef.current?.focus()
  }, [])

  // 选择模型
  const handleSelect = useCallback((model: ModelInfo) => {
    const key = getModelKey(model)
    recordModelUsage(model)
    onSelect(key, model)
    closeMenu()
  }, [onSelect, closeMenu])

  // 聚焦搜索框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 10)
    }
  }, [isOpen])

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        closeMenu()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, closeMenu])

  // 滚动高亮项到可视区域
  useEffect(() => {
    if (!isOpen || flatModels.length === 0) return
    
    const el = document.getElementById(`model-item-${highlightedIndex}`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex, isOpen, flatModels.length])

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          Math.min(prev + 1, flatModels.length - 1)
        )
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => Math.max(prev - 1, 0))
        break
        
      case 'Enter':
        e.preventDefault()
        if (flatModels[highlightedIndex]) {
          handleSelect(flatModels[highlightedIndex])
        }
        break
        
      case 'Escape':
        e.preventDefault()
        closeMenu()
        break
        
      case 'Tab':
        // 允许 Tab 关闭菜单
        closeMenu()
        break
    }
  }, [flatModels, highlightedIndex, handleSelect, closeMenu])

  // Trigger 键盘事件
  const handleTriggerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      openMenu()
    }
  }, [openMenu])

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => isOpen ? closeMenu() : openMenu()}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled || isLoading}
        className="flex items-center gap-1.5 px-2 py-1.5 text-text-200 rounded-lg transition-all duration-150 hover:bg-bg-200/50 hover:text-text-100 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Model selector"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex flex-col items-start">
          <span className="font-medium text-sm leading-tight">{displayName}</span>
          {displayProvider && (
            <span className="text-[10px] text-text-400 leading-tight">{displayProvider}</span>
          )}
        </div>
        <div className={`opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDownIcon size={14} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 w-[340px] bg-bg-000 border border-border-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          role="listbox"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-border-200/50">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setHighlightedIndex(0)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search models..."
                className="w-full bg-bg-200 border border-border-200/50 rounded-lg py-2 pl-9 pr-3 text-sm text-text-100 placeholder:text-text-400 focus:outline-none focus:border-accent-main-100/50 transition-colors"
                aria-label="Search models"
              />
            </div>
          </div>

          {/* Model List */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {/* Recent Models Section */}
            {recentModels.length > 0 && (
              <div className="border-b border-border-200/30">
                <div className="px-3 py-1.5 text-[10px] font-bold text-text-400 uppercase tracking-wider">
                  Recent
                </div>
                {recentModels.map((model) => {
                  const key = getModelKey(model)
                  const globalIndex = flatModels.findIndex(m => getModelKey(m) === key)
                  return (
                    <ModelItem
                      key={`recent-${key}`}
                      model={model}
                      isSelected={selectedModelKey === key}
                      isHighlighted={highlightedIndex === globalIndex}
                      onClick={() => handleSelect(model)}
                      onMouseEnter={() => setHighlightedIndex(globalIndex)}
                      id={`model-item-${globalIndex}`}
                    />
                  )
                })}
              </div>
            )}

            {/* Grouped Models */}
            {modelGroups.map((group) => (
              <ModelGroupSection
                key={group.providerId}
                group={group}
                selectedModelKey={selectedModelKey}
                highlightedIndex={highlightedIndex}
                flatModels={flatModels}
                onSelect={handleSelect}
                onHighlight={setHighlightedIndex}
              />
            ))}

            {/* Empty State */}
            {flatModels.length === 0 && (
              <div className="px-3 py-8 text-sm text-text-400 text-center">
                {isLoading ? 'Loading models...' : searchQuery ? 'No models found' : 'No models available'}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-border-200/30 bg-bg-100/50">
            <div className="flex items-center justify-between text-[10px] text-text-400">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

// ============================================
// Sub-components
// ============================================

interface ModelGroupSectionProps {
  group: ModelGroup
  selectedModelKey: string | null
  highlightedIndex: number
  flatModels: ModelInfo[]
  onSelect: (model: ModelInfo) => void
  onHighlight: (index: number) => void
}

const ModelGroupSection = memo(function ModelGroupSection({
  group,
  selectedModelKey,
  highlightedIndex,
  flatModels,
  onSelect,
  onHighlight,
}: ModelGroupSectionProps) {
  return (
    <div>
      <div className="px-3 py-1.5 text-[10px] font-bold text-text-400 uppercase tracking-wider sticky top-0 bg-bg-000/95 backdrop-blur-sm z-10">
        {group.providerName}
      </div>
      {group.models.map((model) => {
        const key = getModelKey(model)
        const globalIndex = flatModels.findIndex(m => getModelKey(m) === key)
        return (
          <ModelItem
            key={key}
            model={model}
            isSelected={selectedModelKey === key}
            isHighlighted={highlightedIndex === globalIndex}
            onClick={() => onSelect(model)}
            onMouseEnter={() => onHighlight(globalIndex)}
            id={`model-item-${globalIndex}`}
          />
        )
      })}
    </div>
  )
})

interface ModelItemProps {
  model: ModelInfo
  isSelected: boolean
  isHighlighted: boolean
  onClick: () => void
  onMouseEnter: () => void
  id: string
}

const ModelItem = memo(function ModelItem({
  model,
  isSelected,
  isHighlighted,
  onClick,
  onMouseEnter,
  id,
}: ModelItemProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`
        flex items-center justify-between px-3 py-2 cursor-pointer transition-colors
        ${isHighlighted ? 'bg-bg-200' : 'hover:bg-bg-100'}
        ${isSelected ? 'text-accent-main-100' : 'text-text-200'}
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${isSelected ? 'text-accent-main-100' : 'text-text-100'}`}>
            {model.name}
          </span>
          {isSelected && (
            <CheckIcon className="w-4 h-4 text-accent-main-100 flex-shrink-0" />
          )}
        </div>
        <div className="text-[11px] text-text-400 truncate">
          {formatModelDescription(model)}
        </div>
      </div>
    </div>
  )
})

// ============================================
// Helpers
// ============================================

function formatModelDescription(model: ModelInfo): string {
  const parts: string[] = []
  
  // Context limit
  const contextK = Math.round(model.contextLimit / 1000)
  parts.push(`${contextK}K context`)
  
  // Capabilities
  if (model.supportsReasoning) parts.push('reasoning')
  if (model.supportsImages) parts.push('vision')
  
  return parts.join(' · ')
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}
