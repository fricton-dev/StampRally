import { create } from "zustand"

import { AUTH_TOKEN_STORAGE_KEY } from "./config"
import * as api from "./api"
import { useAppStore } from "./store"
import type { AuthResponse, AuthToken, UserProfile } from "../types"

type LoginPayload = {
  identifier: string
  password: string
  tenantId?: string
}

type RegisterPayload = {
  tenantId: string
  username: string
  email: string
  password: string
  gender: string
  age: number
}

type AuthState = {
  token: string | null
  user: UserProfile | null
  loading: boolean
  error: string | null
  hydrate: () => Promise<void>
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  clearError: () => void
}

const persistToken = (token: string | null) => {
  if (!token) {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    return
  }
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

const applyAuthSuccess = (
  set: (partial: Partial<AuthState>) => void,
  token: AuthToken | string,
  profile: UserProfile,
) => {
  const accessToken = typeof token === "string" ? token : token.access_token
  persistToken(accessToken)
  set({ token: accessToken, user: profile, loading: false, error: null })
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  hydrate: async () => {
    const stored = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    if (!stored) {
      return
    }
    set({ loading: true, error: null })
    try {
      const profile = await api.fetchCurrentUser(stored)
      applyAuthSuccess(set, stored, profile)
      if (profile.tenant_id) {
        try {
          const progress = await api.fetchUserProgress(stored)
          useAppStore.getState().setProgress(progress)
        } catch (progressError) {
          console.warn("Failed to load stored progress:", progressError)
        }
      }
    } catch (error) {
      console.error("Failed to hydrate auth state:", error)
      persistToken(null)
      set({ token: null, user: null, loading: false, error: null })
      return
    }
    set((state) => ({ ...state, loading: false }))
  },

  login: async ({ identifier, password, tenantId }: LoginPayload) => {
    set({ loading: true, error: null })
    try {
      const token = await api.loginUser({ identifier, password, tenantId })
      const profile = await api.fetchCurrentUser(token.access_token)
      applyAuthSuccess(set, token, profile)

      if (profile.tenant_id) {
        try {
          const progress = await api.fetchUserProgress(token.access_token)
          useAppStore.getState().setProgress(progress)
        } catch (progressError) {
          console.warn("Failed to fetch user progress:", progressError)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed"
      set({ error: message, loading: false })
      throw error
    }
  },

  register: async ({ tenantId, username, email, password, gender, age }: RegisterPayload) => {
    set({ loading: true, error: null })
    try {
      const response: AuthResponse = await api.registerUser({
        tenantId,
        username,
        email,
        password,
        gender,
        age,
      })
      applyAuthSuccess(set, response.access_token, response.user)
      useAppStore.getState().setProgress({
        tenantId,
        stamps: 0,
        coupons: [],
        stampedStoreIds: [],
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed"
      set({ error: message, loading: false })
      throw error
    }
  },

  logout: () => {
    persistToken(null)
    set({ token: null, user: null, loading: false, error: null })
    useAppStore.getState().resetProgressToSeed()
  },
}))
