// ============================================
// Session API Functions
// ============================================

import {
  API_BASE,
  type ApiSession,
  type SessionListParams,
} from './types'

/**
 * 构建带 directory 的 URL
 */
function buildUrl(path: string, directory?: string, extraParams?: URLSearchParams): string {
  const params = extraParams || new URLSearchParams()
  if (directory) params.set('directory', directory)
  const queryString = params.toString()
  return `${API_BASE}${path}${queryString ? '?' + queryString : ''}`
}

export async function getSessions(params: SessionListParams = {}): Promise<ApiSession[]> {
  const searchParams = new URLSearchParams()
  
  if (params.directory) searchParams.set('directory', params.directory)
  if (params.roots !== undefined) searchParams.set('roots', String(params.roots))
  if (params.start !== undefined) searchParams.set('start', String(params.start))
  if (params.search) searchParams.set('search', params.search)
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit))

  const url = `${API_BASE}/session${searchParams.toString() ? '?' + searchParams.toString() : ''}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.status}`)
  }

  return response.json()
}

export async function getSession(sessionId: string, directory?: string): Promise<ApiSession> {
  const response = await fetch(buildUrl(`/session/${sessionId}`, directory))
  
  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.status}`)
  }

  return response.json()
}

export async function createSession(params: {
  directory?: string
  title?: string
  parentID?: string
} = {}): Promise<ApiSession> {
  const { directory, ...body } = params
  const queryParams = new URLSearchParams()
  if (directory) queryParams.set('directory', directory)
  
  const url = `${API_BASE}/session${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`)
  }

  return response.json()
}

export async function updateSession(sessionId: string, params: {
  title?: string
  time?: { archived?: number }
}, directory?: string): Promise<ApiSession> {
  const response = await fetch(buildUrl(`/session/${sessionId}`, directory), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to update session: ${response.status}`)
  }

  return response.json()
}

export async function deleteSession(sessionId: string, directory?: string): Promise<boolean> {
  const response = await fetch(buildUrl(`/session/${sessionId}`, directory), {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.status}`)
  }

  return response.json()
}

export async function abortSession(sessionId: string, directory?: string): Promise<boolean> {
  const response = await fetch(buildUrl(`/session/${sessionId}/abort`, directory), {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to abort session: ${response.status}`)
  }

  return response.json()
}

export async function revertMessage(
  sessionId: string,
  messageId: string,
  partId?: string,
  directory?: string
): Promise<ApiSession> {
  const body: { messageID: string; partID?: string } = { messageID: messageId }
  if (partId) {
    body.partID = partId
  }

  const response = await fetch(buildUrl(`/session/${sessionId}/revert`, directory), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Failed to revert message: ${response.status}`)
  }

  return response.json()
}

export async function unrevertSession(sessionId: string, directory?: string): Promise<ApiSession> {
  const response = await fetch(buildUrl(`/session/${sessionId}/unrevert`, directory), {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to unrevert session: ${response.status}`)
  }

  return response.json()
}

export async function shareSession(sessionId: string, directory?: string): Promise<ApiSession> {
  const response = await fetch(buildUrl(`/session/${sessionId}/share`, directory), {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to share session: ${response.status}`)
  }

  return response.json()
}

export async function unshareSession(sessionId: string, directory?: string): Promise<ApiSession> {
  const response = await fetch(buildUrl(`/session/${sessionId}/share`, directory), {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to unshare session: ${response.status}`)
  }

  return response.json()
}
