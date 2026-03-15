export type AuthUser = {
  id: string
  firebaseUid: string
  email: string
  name: string
  avatarUrl: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

export type AuthSession = null

export type AppVariables = {
  user: AuthUser | null
  session: AuthSession
}
