"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail, Lock, AlertCircle, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

export function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({})
  const { signup, isLoading } = useAuth()

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {}
    let isValid = true

    if (!email) {
      newErrors.email = "Email is required"
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid"
      isValid = false
    }

    if (!password) {
      newErrors.password = "Password is required"
      isValid = false
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long"
      isValid = false
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
      isValid = false
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      await signup(email, password)
    }
  }

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: "" }

    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1

    const labels = ["Weak", "Fair", "Good", "Strong"]
    return {
      strength,
      label: labels[strength - 1] || "",
    }
  }

  const passwordStrength = getPasswordStrength()

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-2">
          <div className="rounded-full bg-primary/10 p-2">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">Create an Account</CardTitle>
        <CardDescription className="text-center">Enter your details to create a new account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors({ ...errors, email: undefined })
                }}
                className={cn("pl-10", errors.email && "border-red-500 focus-visible:ring-red-500")}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
            </div>
            {errors.email && (
              <div className="flex items-center text-xs text-red-500 mt-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.email}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors({ ...errors, password: undefined })
                }}
                className={cn("pl-10", errors.password && "border-red-500 focus-visible:ring-red-500")}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
            {errors.password ? (
              <div className="flex items-center text-xs text-red-500 mt-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.password}
              </div>
            ) : password ? (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs">Password strength:</span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      passwordStrength.strength === 1 && "text-red-500",
                      passwordStrength.strength === 2 && "text-orange-500",
                      passwordStrength.strength === 3 && "text-yellow-500",
                      passwordStrength.strength === 4 && "text-green-500",
                    )}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      passwordStrength.strength === 1 && "w-1/4 bg-red-500",
                      passwordStrength.strength === 2 && "w-2/4 bg-orange-500",
                      passwordStrength.strength === 3 && "w-3/4 bg-yellow-500",
                      passwordStrength.strength === 4 && "w-full bg-green-500",
                    )}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined })
                }}
                className={cn("pl-10", errors.confirmPassword && "border-red-500 focus-visible:ring-red-500")}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
            {errors.confirmPassword && (
              <div className="flex items-center text-xs text-red-500 mt-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.confirmPassword}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Sign Up"
            )}
          </Button>
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
