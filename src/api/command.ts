// ============================================
// Command API - 命令列表和执行
// ============================================

import { get, post } from './http'
import { formatPathForApi } from '../utils/directoryUtils'

export interface Command {
  name: string
  description?: string
  keybind?: string
}

/**
 * 获取可用命令列表
 */
export async function getCommands(directory?: string): Promise<Command[]> {
  return get<Command[]>('/command', { directory: formatPathForApi(directory) })
}

/**
 * POST /session/{sessionID}/command - 执行斜杠命令
 * @param sessionId Session ID
 * @param command 命令名（不含 /，如 "help"）
 * @param args 命令参数
 * @param directory 工作目录
 */
export async function executeCommand(
  sessionId: string,
  command: string,
  args: string = '',
  directory?: string
): Promise<unknown> {
  return post(
    `/session/${sessionId}/command`,
    { directory: formatPathForApi(directory) },
    { command, arguments: args }
  )
}
