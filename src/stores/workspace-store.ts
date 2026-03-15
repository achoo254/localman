/**
 * Zustand store for active workspace context.
 * Wraps workspaces from sync-store and persists active selection.
 */

import { create } from 'zustand'
import { db } from '../db/database'
import { useSyncStore, type WorkspaceInfo } from './sync-store'
import { getHttpClient } from '../utils/tauri-http-client'
import { getIdToken } from '../services/sync/firebase-auth-client'
import { getApiBaseUrl } from '../utils/api-base-url'

const ACTIVE_WORKSPACE_KEY = 'workspace.active_id'

export interface WorkspaceMember {
  id: string
  userId: string
  name: string
  email: string
  role: string
}

interface WorkspaceStore {
  activeWorkspaceId: string | null
  workspaces: WorkspaceInfo[]

  setActiveWorkspace: (id: string | null) => Promise<void>
  loadWorkspaces: () => Promise<void>
  createWorkspace: (name: string) => Promise<void>
  deleteWorkspace: (id: string) => Promise<void>
  leaveWorkspace: (id: string) => Promise<void>
  listMembers: (workspaceId: string) => Promise<WorkspaceMember[]>
  inviteMember: (workspaceId: string, email: string, role: string) => Promise<void>
  updateMemberRole: (workspaceId: string, memberId: string, role: string) => Promise<void>
  removeMember: (workspaceId: string, memberId: string) => Promise<void>
  loadActiveWorkspaceId: () => Promise<void>
}

async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = await getIdToken()
  if (!token) throw new Error('Not authenticated')
  const f = await getHttpClient()
  const res = await f(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeWorkspaceId: null,
  workspaces: [],

  async loadActiveWorkspaceId() {
    try {
      const setting = await db.settings.get(ACTIVE_WORKSPACE_KEY)
      const id = (setting?.value as string | null) ?? null
      set({ activeWorkspaceId: id })
    } catch {
      set({ activeWorkspaceId: null })
    }
  },

  async setActiveWorkspace(id) {
    set({ activeWorkspaceId: id })
    try {
      await db.settings.put({ key: ACTIVE_WORKSPACE_KEY, value: id })
    } catch {
      // Non-blocking
    }
    // Subscribe to workspace WS channel if not personal
    const syncStore = useSyncStore.getState()
    if (id) syncStore.subscribeWorkspace(id)
  },

  async loadWorkspaces() {
    const syncStore = useSyncStore.getState()
    await syncStore.loadWorkspaces()
    const workspaces = useSyncStore.getState().workspaces
    set({ workspaces })
  },

  async createWorkspace(name) {
    await apiRequest<{ id: string; name: string }>(
      '/api/workspaces',
      { method: 'POST', body: { name } }
    )
    await get().loadWorkspaces()
  },

  async deleteWorkspace(id) {
    await apiRequest<void>(`/api/workspaces/${id}`, { method: 'DELETE' })
    const { activeWorkspaceId } = get()
    if (activeWorkspaceId === id) await get().setActiveWorkspace(null)
    await get().loadWorkspaces()
  },

  async leaveWorkspace(id) {
    await apiRequest<void>(`/api/workspaces/${id}/leave`, { method: 'POST' })
    const { activeWorkspaceId } = get()
    if (activeWorkspaceId === id) await get().setActiveWorkspace(null)
    await get().loadWorkspaces()
  },

  async listMembers(workspaceId) {
    return apiRequest<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`)
  },

  async inviteMember(workspaceId, email, role) {
    await apiRequest<void>(
      `/api/workspaces/${workspaceId}/invite`,
      { method: 'POST', body: { email, role } }
    )
  },

  async updateMemberRole(workspaceId, memberId, role) {
    await apiRequest<void>(
      `/api/workspaces/${workspaceId}/members/${memberId}`,
      { method: 'PATCH', body: { role } }
    )
  },

  async removeMember(workspaceId, memberId) {
    await apiRequest<void>(
      `/api/workspaces/${workspaceId}/members/${memberId}`,
      { method: 'DELETE' }
    )
  },
}))
