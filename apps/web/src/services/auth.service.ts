import { api } from './api.client'

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    username: string
    email?: string
    roles: string[]
  }
  expiresIn: number
}

export interface User {
  id: string
  username: string
  email?: string
  roles: string[]
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.auth.login(credentials)
    
    // Store token in localStorage
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    
    return response.data
  },

  async logout(): Promise<void> {
    try {
      await api.auth.logout()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout API call failed:', error)
    } finally {
      // Always clear local storage
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
    }
  },

  async refreshToken(): Promise<AuthResponse> {
    const response = await api.auth.refresh()
    
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    
    return response.data
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  },

  getToken(): string | null {
    return localStorage.getItem('authToken')
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },

  hasRole(role: string): boolean {
    const user = this.getCurrentUser()
    return user?.roles.includes(role) ?? false
  },
}

