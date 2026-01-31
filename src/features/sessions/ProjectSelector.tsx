import { useState, useRef, useEffect } from 'react'
import { FolderIcon, GlobeIcon, ChevronDownIcon, PlusIcon, TrashIcon } from '../../components/Icons'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { ApiProject } from '../../api'

interface ProjectSelectorProps {
  currentProject: ApiProject | null
  projects: ApiProject[]
  isLoading: boolean
  onSelectProject: (projectId: string) => void
  onAddProject: () => void
  onRemoveProject: (projectId: string) => void
}

export function ProjectSelector({
  currentProject,
  projects,
  isLoading,
  onSelectProject,
  onAddProject,
  onRemoveProject,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; projectId: string | null }>({
    isOpen: false,
    projectId: null
  })
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 获取显示名称
  const getDisplayName = (project: ApiProject | null) => {
    if (!project) return isLoading ? 'Loading...' : 'No project'
    
    // 优先用 name
    if (project.name) return project.name
    
    // 如果是 global，显示 "Global"
    if (project.id === 'global') return 'Global'
    
    // 否则显示目录名
    const worktree = project.worktree || ''
    const parts = worktree.replace(/\\/g, '/').split('/').filter(Boolean)
    return parts[parts.length - 1] || worktree
  }

  // 获取完整路径（用于 tooltip）
  const getFullPath = (project: ApiProject | null) => {
    if (!project) return ''
    return project.worktree
  }

  // 过滤掉当前选中的 project
  const otherProjects = projects.filter(p => p.id !== currentProject?.id)

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="w-full flex flex-col items-start px-2 py-1.5 text-left hover:bg-bg-200/50 rounded-lg transition-colors group"
        title={getFullPath(currentProject)}
      >
        <div className="w-full flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-text-100 truncate tracking-tight">
            {getDisplayName(currentProject)}
          </span>
          <ChevronDownIcon className={`text-text-400 w-3 h-3 flex-shrink-0 transition-all duration-200 ${isOpen ? 'rotate-180 opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
        </div>
        <span className="text-[10px] text-text-400 truncate opacity-70 font-mono w-full">
          {currentProject?.id === 'global' ? 'All Projects' : getFullPath(currentProject)}
        </span>
      </button>

      {/* Dropdown - 使用 grid 实现平滑展开动画 */}
      <div 
        className={`absolute top-full left-0 right-0 mt-2 z-50 grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div className="bg-bg-000/95 backdrop-blur-md border border-border-200 rounded-xl shadow-xl overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1.5">
              <div className="px-2 py-1.5 text-[10px] font-bold text-text-400 uppercase tracking-wider">
                Switch Project
              </div>
              
              {/* Global (if not current) */}
              {projects.find(p => p.id === 'global' && p.id !== currentProject?.id) && (
                <ProjectItem
                  project={projects.find(p => p.id === 'global')!}
                  onClick={() => {
                    onSelectProject('global')
                    setIsOpen(false)
                  }}
                  getDisplayName={getDisplayName}
                  getFullPath={getFullPath}
                />
              )}

              {/* Other Projects */}
              {otherProjects.filter(p => p.id !== 'global').map((project) => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  onClick={() => {
                    onSelectProject(project.id)
                    setIsOpen(false)
                  }}
                  onRemove={(e) => {
                    e.stopPropagation()
                    setDeleteConfirm({ isOpen: true, projectId: project.id })
                  }}
                  getDisplayName={getDisplayName}
                  getFullPath={getFullPath}
                />
              ))}
              
              {otherProjects.length === 0 && !projects.find(p => p.id === 'global' && p.id !== currentProject?.id) && (
                <div className="px-3 py-4 text-center text-xs text-text-400">
                  No other projects
                </div>
              )}
            </div>
            
            {/* Footer Actions */}
            <div className="p-1.5 border-t border-border-200 bg-bg-50/50">
              <button
                onClick={() => {
                  onAddProject()
                  setIsOpen(false)
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-200 hover:text-text-100 hover:bg-bg-200 transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Add Project Folder...
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, projectId: null })}
        onConfirm={() => {
          if (deleteConfirm.projectId) {
            onRemoveProject(deleteConfirm.projectId)
          }
          setDeleteConfirm({ isOpen: false, projectId: null })
        }}
        title="Remove Project"
        description="Are you sure you want to remove this project folder from the list? This will not delete the actual files."
        confirmText="Remove"
        variant="danger"
      />
    </div>
  )
}

function ProjectItem({ 
  project, 
  onClick, 
  onRemove,
  getDisplayName, 
  getFullPath 
}: { 
  project: ApiProject
  onClick: () => void
  onRemove?: (e: React.MouseEvent) => void
  getDisplayName: (p: ApiProject) => string
  getFullPath: (p: ApiProject) => string
}) {
  const colorName = project.icon?.color || (project.id === 'global' ? 'blue' : 'gray')
  const colorClass = getColorClass(colorName)

  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-bg-100 transition-colors relative"
      title={getFullPath(project)}
    >
      <div 
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${colorClass}`}
      >
        {project.id === 'global' ? (
          <GlobeIcon className="w-4 h-4" />
        ) : (
          <FolderIcon className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-text-200 truncate">
          {getDisplayName(project)}
        </p>
        <p className="text-[10px] text-text-400 truncate opacity-70 font-mono">
          {project.id === 'global' ? 'All scopes' : getFullPath(project)}
        </p>
      </div>
      
      {onRemove && (
        <div 
          onClick={onRemove}
          className="absolute right-2 p-1.5 rounded-md text-text-400 hover:text-danger-100 hover:bg-bg-200 opacity-0 group-hover:opacity-100 transition-all"
          title="Remove from list"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </div>
      )}
    </button>
  )
}

// 颜色映射：使用语义化 CSS 变量 + 透明度
function getColorClass(colorName: string): string {
  const map: Record<string, string> = {
    red: 'text-danger-100 bg-danger-100/10',
    orange: 'text-warning-100 bg-warning-100/10',
    amber: 'text-warning-100 bg-warning-100/10',
    yellow: 'text-warning-100 bg-warning-100/10',
    green: 'text-success-100 bg-success-100/10',
    emerald: 'text-success-100 bg-success-100/10',
    teal: 'text-info-100 bg-info-100/10',
    cyan: 'text-info-100 bg-info-100/10',
    sky: 'text-info-100 bg-info-100/10',
    blue: 'text-info-100 bg-info-100/10',
    indigo: 'text-accent-main-100 bg-accent-main-100/10',
    violet: 'text-accent-main-100 bg-accent-main-100/10',
    purple: 'text-accent-main-100 bg-accent-main-100/10',
    fuchsia: 'text-accent-main-100 bg-accent-main-100/10',
    pink: 'text-accent-main-100 bg-accent-main-100/10',
    rose: 'text-danger-100 bg-danger-100/10',
    gray: 'text-text-400 bg-bg-200',
  }
  return map[colorName] || map['gray']
}

