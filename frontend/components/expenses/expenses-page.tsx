"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/auth-context"
import { MainNav } from "@/components/layout/main-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ExpenseForm } from "@/components/expenses/expense-form"
import { ExpensesList } from "@/components/expenses/expenses-list"
import { getExpenses, getCategories, getPaymentMethods, type ExpenseFilters, type Expense } from "@/lib/api"
import { PlusCircle, Filter } from "lucide-react"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"

// TODO: Move these types to a shared location (e.g., lib/types.ts)
interface Category {
  id: string
  name: string
  is_expense: boolean
}

interface PaymentMethod {
  id: string
  name: string
  is_expense: boolean
}

const ITEMS_PER_PAGE = 10 // For displaying pages
const COUNT_FETCH_LIMIT = 500 // Backend max limit for counting

export function ExpensesPage() {
  const { isLoading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoadingData, setIsLoadingData] = useState(true) // For categories/methods
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true) // For current page expenses
  const [isLoadingTotalCount, setIsLoadingTotalCount] = useState(false) // For total count fetch
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<Omit<ExpenseFilters, "skip" | "limit">>({
    startDate: undefined,
    endDate: undefined,
    categoryId: undefined,
    paymentMethodId: undefined,
    type: undefined,
  })
  const [totalExpenses, setTotalExpenses] = useState(0)

  // Effect to handle query parameters on initial load
  useEffect(() => {
    if (!authLoading) {
      const action = searchParams.get("action")
      if (action === "add") {
        handleAddExpense()
        router.replace("/expenses", { scroll: false })
      }
    }
  }, [authLoading, router, searchParams])

  // --- Data Fetching Functions ---

  // Fetches ONLY the expenses for the specified page number
  const fetchExpensesPage = useCallback(
    async (pageToFetch: number) => {
      setIsLoadingExpenses(true)
      try {
        const skip = (pageToFetch - 1) * ITEMS_PER_PAGE
        const currentFilters: ExpenseFilters = {
          ...filters,
          skip: skip,
          limit: ITEMS_PER_PAGE,
        }
        const expensesResponse = await getExpenses(currentFilters)
        if (!Array.isArray(expensesResponse)) {
          console.error("API did not return an array for expenses:", expensesResponse)
          throw new Error("Unexpected response format from API")
        }
        setExpenses(expensesResponse)
      } catch (error) {
        toast.error("Failed to load expenses page")
        console.error("Error fetching expenses page:", error)
        setExpenses([]) // Clear page data on error
      } finally {
        setIsLoadingExpenses(false)
      }
    },
    [filters],
  ) // Depends on filters

  // Fetches the TOTAL count by iterating calls with limit 500
  const fetchTotalExpenseCount = useCallback(async () => {
    setIsLoadingTotalCount(true)
    setTotalExpenses(0) // Reset count while fetching
    let accumulatedCount = 0
    let currentSkip = 0
    let hasMore = true

    try {
      while (hasMore) {
        const countFilters: ExpenseFilters = {
          ...filters, // Use the current filters
          skip: currentSkip,
          limit: COUNT_FETCH_LIMIT, // Use the backend max limit
        }
        const response = await getExpenses(countFilters)
        if (!Array.isArray(response)) {
          console.error("API did not return an array during count:", response)
          throw new Error("Unexpected response format from API during count")
        }

        accumulatedCount += response.length
        if (response.length < COUNT_FETCH_LIMIT) {
          hasMore = false // Reached the end
        } else {
          currentSkip += COUNT_FETCH_LIMIT // Prepare for next chunk
        }
      }
      setTotalExpenses(accumulatedCount)
    } catch (error) {
      toast.error("Failed to calculate total expenses")
      console.error("Error fetching total expense count:", error)
      setTotalExpenses(0) // Reset on error
    } finally {
      setIsLoadingTotalCount(false)
    }
  }, [filters]) // Depends on filters

  // --- Effects ---

  // Fetch static data (categories, payment methods) once on load
  useEffect(() => {
    if (!authLoading) {
      const fetchStaticData = async () => {
        setIsLoadingData(true)
        try {
          const [categoriesData, paymentMethodsData] = await Promise.all([getCategories(), getPaymentMethods()])
          setCategories(Array.isArray(categoriesData) ? categoriesData : categoriesData.items || [])
          setPaymentMethods(Array.isArray(paymentMethodsData) ? paymentMethodsData : paymentMethodsData.items || [])
        } catch {
          toast.error("Failed to load categories or payment methods")
          setCategories([])
          setPaymentMethods([])
        } finally {
          setIsLoadingData(false)
        }
      }
      fetchStaticData()
    }
  }, [authLoading])

  // Fetch page 1 AND total count when filters change or on initial load
  useEffect(() => {
    if (!authLoading) {
      fetchExpensesPage(1) // Fetch page 1 for display
      fetchTotalExpenseCount() // Fetch total count for pagination
    }
  }, [authLoading, filters, fetchExpensesPage, fetchTotalExpenseCount]) // Re-run if filters or fetch functions change

  // Fetch ONLY the specific page when currentPage changes (and is not 1)
  useEffect(() => {
    if (!authLoading && currentPage !== 1) {
      fetchExpensesPage(currentPage)
    }
  }, [authLoading, currentPage, fetchExpensesPage]) // Add authLoading dependency

  // --- Event Handlers ---

  const handleAddExpense = () => {
    setExpenseToEdit(undefined)
    setShowExpenseForm(true)
  }

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense)
    setShowExpenseForm(true)
  }

  const handleFilterChange = (key: string, value: string) => {
    const apiValue = value === "all" || value === "" ? undefined : value
    setFilters((prev) => ({
      ...prev,
      [key]: apiValue,
    }))
    setCurrentPage(1) // Resetting page triggers the filter change effect
  }

  // Just update the state, the effect will fetch the data
  const handlePageChange = (newPage: number) => {
    if (newPage > 0) {
      setCurrentPage(newPage)
    }
  }

  const clearFilters = () => {
    setFilters({
      startDate: undefined,
      endDate: undefined,
      categoryId: undefined,
      paymentMethodId: undefined,
      type: undefined,
    })
    setCurrentPage(1) // Resetting page triggers the filter change effect
  }

  const handleSuccess = () => {
    setShowExpenseForm(false)
    // Refetch current page data AND total count after add/edit
    fetchExpensesPage(currentPage)
    fetchTotalExpenseCount()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <MobileNav />
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader
          title="Expenses"
          description="Manage your transactions"
          action={
            <Button onClick={handleAddExpense} disabled={isLoadingData}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          }
        />

        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Filters</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-sm">
                  Clear Filters
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Start Date</label>
                  <Input
                    type="date"
                    value={filters.startDate || ""}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">End Date</label>
                  <Input
                    type="date"
                    value={filters.endDate || ""}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <Select
                    value={filters.categoryId || "all"} // Use 'all' for display
                    onValueChange={(value) => handleFilterChange("categoryId", value)}
                    disabled={isLoadingData} // Disable while loading categories
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Payment Method</label>
                  <Select
                    value={filters.paymentMethodId || "all"} // Use 'all' for display
                    onValueChange={(value) => handleFilterChange("paymentMethodId", value)}
                    disabled={isLoadingData} // Disable while loading methods
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {paymentMethods.map((method: PaymentMethod) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Type</label>
                  <Select value={filters.type || "all"} onValueChange={(value) => handleFilterChange("type", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Need">Need</SelectItem>
                      <SelectItem value="Want">Want</SelectItem>
                      <SelectItem value="Investment">Investment</SelectItem>
                      <SelectItem value="Income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state for the expenses list */}
        {isLoadingExpenses ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <ExpensesList
            expenses={expenses}
            categories={categories}
            paymentMethods={paymentMethods}
            onEdit={handleEditExpense}
            onRefresh={() => {
              fetchExpensesPage(currentPage)
              fetchTotalExpenseCount() // Also refresh total count on manual refresh
            }}
            currentPage={currentPage}
            pageSize={ITEMS_PER_PAGE}
            totalCount={totalExpenses} // Use the actual total count
            onPageChange={handlePageChange}
            // Optionally indicate if total count is still loading
            isTotalLoading={isLoadingTotalCount}
          />
        )}
      </div>

      <ExpenseForm
        isOpen={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
        onSuccess={handleSuccess}
        expenseToEdit={expenseToEdit}
      />
    </div>
  )
}
