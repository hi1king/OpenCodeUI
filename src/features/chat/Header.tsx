import { useState, useRef, useEffect } from 'react'
import { ComposeIcon, MenuDotsIcon, SunIcon, MoonIcon, SystemIcon, SidebarIcon, MaximizeIcon, MinimizeIcon } from '../../components/Icons'
import { DropdownMenu, MenuItem, IconButton } from '../../components/ui'
import { ModelSelector } from './ModelSelector'
import type { ThemeMode } from '../../hooks'
import type { ModelInfo } from '../../api'

interface HeaderProps {
  models: ModelInfo[]
  modelsLoading: boolean
  selectedModelKey: string | null  // providerId:modelId 格式
  onModelChange: (modelKey: string, model: ModelInfo) => void
  onNewChat: () => void
  onToggleSidebar: () => void
  themeMode: ThemeMode
  onThemeChange: (mode: ThemeMode) => void
  isWideMode?: boolean
  onToggleWideMode?: () => void
}

export function Header({
  models,
  modelsLoading,
  selectedModelKey,
  onModelChange,
  onNewChat,
  onToggleSidebar,
  themeMode,
  onThemeChange,
  isWideMode,
  onToggleWideMode,
}: HeaderProps) {
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)
  const settingsTriggerRef = useRef<HTMLButtonElement>(null)
  const settingsMenuRef = useRef<HTMLDivElement>(null)

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(e.target as Node) &&
        !settingsTriggerRef.current?.contains(e.target as Node)
      ) {
        setSettingsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="h-14 flex justify-between items-center px-4 z-20 pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Sidebar Toggle */}
        <IconButton
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          size="sm"
          className="hover:bg-bg-200/50"
        >
          <SidebarIcon />
        </IconButton>

        {/* Model Selector */}
        <ModelSelector
          models={models}
          selectedModelKey={selectedModelKey}
          onSelect={onModelChange}
          isLoading={modelsLoading}
        />
      </div>

      <div className="flex items-center gap-1 pointer-events-auto">
        {/* Wide Mode Toggle */}
        {onToggleWideMode && (
          <IconButton
            aria-label={isWideMode ? "Standard width" : "Wide mode"}
            onClick={onToggleWideMode}
            size="sm"
            className="hover:bg-bg-200/50 hidden sm:flex text-text-400 hover:text-text-100"
          >
            {isWideMode ? <MinimizeIcon /> : <MaximizeIcon />}
          </IconButton>
        )}

        {/* New Chat Button */}
        <IconButton
          aria-label="New chat"
          onClick={onNewChat}
          size="sm"
          className="hover:bg-bg-200/50"
        >
          <ComposeIcon size={18} />
        </IconButton>

        {/* Settings Button */}
        <div className="relative">
          <IconButton
            ref={settingsTriggerRef}
            aria-label="Menu"
            onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
            size="sm"
            className="hover:bg-bg-200/50"
          >
            <MenuDotsIcon />
          </IconButton>

          {/* Settings Menu */}
          <DropdownMenu
            triggerRef={settingsTriggerRef}
            isOpen={settingsMenuOpen}
            position="bottom"
            align="right"
            width={220}
          >
            <div ref={settingsMenuRef}>
              <div className="px-3 py-2">
                <p className="text-xs text-text-400 mb-2">Theme</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => onThemeChange('system')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      themeMode === 'system'
                        ? 'bg-bg-300 text-text-100'
                        : 'text-text-300 hover:bg-bg-200 hover:text-text-200'
                    }`}
                  >
                    <SystemIcon />
                    <span>Auto</span>
                  </button>
                  <button
                    onClick={() => onThemeChange('light')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      themeMode === 'light'
                        ? 'bg-bg-300 text-text-100'
                        : 'text-text-300 hover:bg-bg-200 hover:text-text-200'
                    }`}
                  >
                    <SunIcon />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => onThemeChange('dark')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      themeMode === 'dark'
                        ? 'bg-bg-300 text-text-100'
                        : 'text-text-300 hover:bg-bg-200 hover:text-text-200'
                    }`}
                  >
                    <MoonIcon />
                    <span>Dark</span>
                  </button>
                </div>
              </div>
              <div className="border-t border-border-300/30 my-1" />
              <MenuItem
                label="Convert to task"
                disabled
                onClick={() => setSettingsMenuOpen(false)}
              />
              <MenuItem
                label="Settings"
                onClick={() => setSettingsMenuOpen(false)}
              />
              <MenuItem
                label="Take a screenshot"
                disabled
                onClick={() => setSettingsMenuOpen(false)}
              />
              <MenuItem
                label="Add an image"
                onClick={() => setSettingsMenuOpen(false)}
              />
            </div>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
