"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"

type User = {
  email: string
}

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Protect routes that require authentication
    const publicRoutes = ["/login", "/signup"]
    if (!isLoading && !user && !publicRoutes.includes(pathname)) {
      router.push("/login")
    }
  }, [user, pathname, isLoading, router])

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }
      if (typeof window !== "undefined" && data.csrfToken) {
        localStorage.setItem("csrf_token", data.csrfToken)
      }
      setUser({ email })
      toast.success("Logged in successfully")
      router.push("/")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Signup failed")
      }
      if (typeof window !== "undefined" && data.csrfToken) {
        localStorage.setItem("csrf_token", data.csrfToken)
      }
      toast.success("Account created successfully. Please log in.")
      router.push("/login")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signup failed")
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
    } catch (e) {
      // ignore error
    }
    setUser(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem("csrf_token")
    }
    toast.success("Logged out successfully")
    router.push("/login")
    setIsLoading(false)
  }

  return <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
