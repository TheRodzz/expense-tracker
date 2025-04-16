const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"

// Utility to read CSRF token from localStorage
function getCsrfTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("csrf_token")
}

// Helper to normalize headers to Record<string, string>
function normalizeHeaders(headersInit?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!headersInit) return headers
  if (headersInit instanceof Headers) {
    headersInit.forEach((value, key) => {
      headers[key] = value
    })
  } else if (Array.isArray(headersInit)) {
    headersInit.forEach(([key, value]) => {
      headers[key] = value
    })
  } else {
    Object.assign(headers, headersInit)
  }
  return headers
}

export async function fetchWithCreds(url: string, options: RequestInit = {}, csrfToken?: string | null) {
  // Always include credentials (cookies) for API requests
  const isApi = url.startsWith("/api/") && !url.startsWith("/api/auth/")
  const method = (options.method || "GET").toUpperCase()
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method)

  const headers: Record<string, string> = normalizeHeaders(options.headers)
  headers["Content-Type"] = "application/json"

  // For state-changing API requests (except /api/auth/*), add CSRF token from argument
  if (isApi && isMutation && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: "include",
    headers,
  })
  if (response.status === 401) {
    // Optionally handle unauthorized globally
    throw new Error("Unauthorized. Please log in again.")
  }
  return response
}

// Categories API
export type CategoryData = {
  id?: string // Optional for create
  name: string
  is_expense: boolean
  // Add other fields if needed (e.g., user_id, created_at, updated_at from get response)
}

export async function getCategories(skip?: number, limit?: number) {
  const queryParams = new URLSearchParams()
  if (skip !== undefined) queryParams.append("skip", String(skip))
  if (limit !== undefined) queryParams.append("limit", String(limit))

  const queryString = queryParams.toString()
  const url = queryString ? `/api/categories?${queryString}` : "/api/categories"

  const response = await fetchWithCreds(url)
  if (!response.ok) {
    throw new Error("Failed to fetch categories")
  }
  return response.json()
}

export async function createCategory(data: Pick<CategoryData, "name" | "is_expense">) {
  const csrfToken = getCsrfTokenFromStorage()
  const response = await fetchWithCreds(
    "/api/categories",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    csrfToken,
  )

  if (!response.ok) {
    throw new Error("Failed to create category")
  }

  return response.json()
}

export async function updateCategory(id: string, data: Pick<CategoryData, "name" | "is_expense">) {
  const csrfToken = getCsrfTokenFromStorage()
  const response = await fetchWithCreds(
    `/api/categories/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    csrfToken,
  )

  if (!response.ok) {
    throw new Error("Failed to update category")
  }

  return response.json()
}

export async function deleteCategory(id: string) {
  const csrfToken = getCsrfTokenFromStorage()
  const response = await fetchWithCreds(
    `/api/categories/${id}`,
    {
      method: "DELETE",
    },
    csrfToken,
  )

  if (!response.ok) {
    throw new Error("Failed to delete category")
  }

  return true
}

// Payment Methods API
export type PaymentMethodData = {
  id?: string // Optional for create
  name: string
  is_expense: boolean
  // Add other fields if needed
}

export async function getPaymentMethods(skip?: number, limit?: number) {
  const queryParams = new URLSearchParams()
  if (skip !== undefined) queryParams.append("skip", String(skip))
  if (limit !== undefined) queryParams.append("limit", String(limit))

  const queryString = queryParams.toString()
  const url = queryString ? `/api/payment_methods?${queryString}` : "/api/payment_methods"

  const response = await fetchWithCreds(url)
  if (!response.ok) {
    throw new Error("Failed to fetch payment methods")
  }
  return response.json()
}

export async function createPaymentMethod(data: Pick<PaymentMethodData, "name" | "is_expense">) {
  const csrfToken = getCsrfTokenFromStorage()
  const response = await fetchWithCreds(
    "/api/payment_methods",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    csrfToken,
  )

  if (!response.ok) {
    throw new Error("Failed to create payment method")
  }

  return response.json()
}

export async function updatePaymentMethod(id: string, data: Pick<PaymentMethodData, "name" | "is_expense">) {
  const csrfToken = getCsrfTokenFromStorage()
  const response = await fetchWithCreds(
    `/api/payment_methods/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    csrfToken,
  )

  if (!response.ok) {
    throw new Error("Failed to update payment method")
  }

  return response.json()
}

export async function deletePaymentMethod(id: string) {
  const csrfToken = getCsrfTokenFromStorage()
  const response = await fetchWithCreds(
    `/api/payment_methods/${id}`,
    {
      method: "DELETE",
    },
    csrfToken,
  )

  if (!response.ok) {
    throw new Error("Failed to delete payment method")
  }

  return true
}

// Expenses API
export type Expense = {
  id: string
  category_id: string
  payment_method_id: string
  amount: number
  type: "Need" | "Want" | "Investment" | "Income"
  description: string
  timestamp: string
  created_at: string
  updated_at: string
}

export type ExpenseFormData = {
  category_id: string
  payment_method_id: string
  amount: number
  type: "Need" | "Want" | "Investment" | "Income"
  description: string
  timestamp: string
}

export type ExpenseFilters = {
  startDate?: string
  endDate?: string
  categoryId?: string
  paymentMethodId?: string
  type?: "Need" | "Want" | "Investment" | "Income"
  skip?: number
  limit?: number
}

export async function getExpenses(filters: ExpenseFilters = {}) {
  const queryParams = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      let paramValue = String(value)
      // Convert date strings (YYYY-MM-DD) to ISO 8601 format (start of day UTC)
      if (
        (key === "startDate" || key === "endDate") &&
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
      ) {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          // Adjust for timezone offset to get UTC midnight
          const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
          paramValue = utcDate.toISOString()
        }
      }
      queryParams.append(key, paramValue)
    }
  })

  const response = await fetchWithCreds(`/api/expenses?${queryParams.toString()}`)

  if (!response.ok) {
    throw new Error("Failed to fetch expenses")
  }

  return response.json()
}

export async function getExpense(id: string) {
  const response = await fetchWithCreds(`/api/expenses/${id}`)

  if (!response.ok) {
    throw new Error("Failed to fetch expense")
  }

  return response.json()
}

export async function createExpense(data: ExpenseFormData) {
  const csrfToken = getCsrfTokenFromStorage()
  const response = await fetchWithCreds(
    "/api/expenses",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    csrfToken,
  )

  if (!response.ok) {
    throw new Error("Failed to create expense")
  }

  return response.json()
}

export async function updateExpense(id: string, data: Partial<ExpenseFormData>) {
  const csrfToken = getCsrfTokenFromStorage()
  const response = await fetchWithCreds(
    `/api/expenses/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    csrfToken,
  )

  if (!response.ok) {
    throw new Error("Failed to update expense")
  }

  return response.json()
}

export async function deleteExpense(id: string) {
  const csrfToken = getCsrfTokenFromStorage()
  const response = await fetchWithCreds(
    `/api/expenses/${id}`,
    {
      method: "DELETE",
    },
    csrfToken,
  )

  if (!response.ok) {
    throw new Error("Failed to delete expense")
  }

  return true
}

// Analytics API
export type CategorySpendSummary = {
  categoryId: string
  categoryName: string
  totalAmount: number
  expenseCount: number
  averageAmount: number
}

export async function getAverageCategorySpend(startDate: string, endDate: string) {
  // Convert date strings (YYYY-MM-DD) to ISO 8601 format (start of day UTC)
  let isoStartDate = startDate
  let isoEndDate = endDate

  if (typeof startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    const date = new Date(startDate)
    if (!isNaN(date.getTime())) {
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      isoStartDate = utcDate.toISOString()
    }
  }

  if (typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    const date = new Date(endDate)
    if (!isNaN(date.getTime())) {
      // For end date, set to the end of the day in UTC
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999))
      isoEndDate = utcDate.toISOString()
    }
  }

  const queryParams = new URLSearchParams({
    startDate: isoStartDate,
    endDate: isoEndDate,
  })

  const response = await fetchWithCreds(`/api/analytics/average-spend?${queryParams.toString()}`)

  if (!response.ok) {
    throw new Error("Failed to fetch analytics data")
  }

  return response.json()
}
