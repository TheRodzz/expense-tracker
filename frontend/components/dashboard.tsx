"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { MainNav } from "@/components/layout/main-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getExpenses, getCategories, getPaymentMethods } from "@/lib/api"
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, Tags, PiggyBank, Receipt } from "lucide-react"
import Link from "next/link"

// Define Expense type locally or import if shared
// Ensure this matches the updated type in api.ts
type DashboardExpense = {
  id: string
  amount: number
  type: "Need" | "Want" | "Investment" | "Income"
  description: string
  timestamp: string
  // Add other fields if needed by Recent Transactions list
}

export function Dashboard() {
  const { isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [recentExpenses, setRecentExpenses] = useState<DashboardExpense[]>([]) // Use specific type
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0) // Need + Want
  const [totalInvestment, setTotalInvestment] = useState(0) // Investment
  const [categoriesCount, setCategoriesCount] = useState(0)
  const [paymentMethodsCount, setPaymentMethodsCount] = useState(0)

  useEffect(() => {
    if (!authLoading) {
      fetchDashboardData()
    }
  }, [authLoading])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      // Get recent expenses, explicitly type the response
      const expensesResponse = await getExpenses({ limit: 5 })
      setRecentExpenses(expensesResponse as DashboardExpense[])

      // Calculate totals for current month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

      const monthlyExpenses = await getExpenses({
        startDate: startOfMonth,
        endDate: endOfMonth,
        limit: 500, // Fetch enough to cover typical monthly expenses
      })

      let income = 0
      let expense = 0
      let investment = 0

      // Use typed loop variable
      monthlyExpenses.forEach((item: DashboardExpense) => {
        switch (item.type) {
          case "Income":
            income += item.amount
            break
          case "Investment":
            investment += item.amount
            break
          case "Need":
          case "Want":
            expense += item.amount
            break
          // No default needed if types are exhaustive
        }
      })

      setTotalIncome(income)
      setTotalExpense(expense)
      setTotalInvestment(investment)

      // Get categories and payment methods count
      const categories = await getCategories()
      const paymentMethods = await getPaymentMethods()

      setCategoriesCount(categories.length)
      setPaymentMethodsCount(paymentMethods.length)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <MobileNav />
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader
          title="Dashboard"
          description="Overview of your finances"
          action={
            <Button asChild>
              <Link href="/expenses?action=add">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Transaction
              </Link>
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="overflow-hidden border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income (This Month)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-[100px]" />
              ) : (
                <div className="text-2xl font-bold text-green-500">{formatCurrency(totalIncome)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Monthly income tracking</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses (This Month)</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-[100px]" />
              ) : (
                <div className="text-2xl font-bold text-red-500">{formatCurrency(totalExpense)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Combined needs and wants</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investments (This Month)</CardTitle>
              <PiggyBank className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-[100px]" />
              ) : (
                <div className="text-2xl font-bold text-blue-500">{formatCurrency(totalInvestment)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Long-term growth</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-[100px]" />
              ) : (
                <div className="text-2xl font-bold text-purple-500">
                  {formatCurrency(totalIncome - totalExpense - totalInvestment)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Income - Expenses - Investments</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories & Payment Methods</CardTitle>
              <Tags className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-[100px]" />
              ) : (
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>{categoriesCount} Categories</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>{paymentMethodsCount} Payment Methods</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/expenses">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
              </div>
            ) : recentExpenses.length > 0 ? (
              <div className="space-y-2">
                {recentExpenses.map((expense: DashboardExpense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <div className="font-medium">{expense.description}</div>
                      <div className="text-sm text-muted-foreground">{formatDate(expense.timestamp)}</div>
                    </div>
                    <div
                      className={`font-medium ${expense.type === "Income" ? "text-green-500" : expense.type === "Investment" ? "text-blue-500" : "text-red-500"}`}
                    >
                      {expense.type === "Income" ? "+" : "-"}
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                ))}
                <div className="pt-2 text-center">
                  <Button variant="outline" asChild>
                    <Link href="/expenses">View All Transactions</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No transactions yet</p>
                <Button asChild>
                  <Link href="/expenses">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Your First Expense
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
