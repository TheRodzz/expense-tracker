"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTheme } from "next-themes"
import { useAuth } from "@/context/auth-context"
import { MainNav } from "@/components/layout/main-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"

import { getExpenses, getCategories, type Expense } from "@/lib/api" // Assuming API functions and types
import {
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfYear,
  endOfYear,
  subYears,
} from "date-fns"
import { toast } from "sonner"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Text,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  type TooltipProps,
} from "recharts"
import { CalendarDays, DollarSign, PiggyBank, TrendingUp, PlusCircle } from "lucide-react"
import Link from "next/link"

// --- Constants ---
const DATA_FETCH_LIMIT = 500

// Define a potentially more visually appealing color palette for Pie Chart
const COLORS = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
]

// --- Utility Functions ---
const formatDateForInput = (date: Date): string => format(date, "yyyy-MM-dd")

// Define a basic Category type (replace with actual type if available)
interface Category {
  id: string
  name: string
}

// --- Helper Components for Chart ---

// 1. Custom Tooltip Component for Pie Chart

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  // The payload type within TooltipProps is often generic.
  // We might need to assert the type of the nested payload if necessary.
  if (active && payload && payload.length && payload[0].payload) {
    // Assuming the nested payload has the structure defined in PieChartPayloadData
    // const entryPayload = payload[0].payload as PieChartPayloadData;
    const value = payload[0].value // The numeric value of the slice
    const name = payload[0].name // The name/key of the slice

    return (
      <div className="p-2 bg-background border rounded shadow-sm text-sm dark:bg-popover dark:border-border">
        <p className="font-semibold">{`${name}`}</p>
        {/* Ensure value is treated as a number for formatting */}
        <p className="text-muted-foreground">{`Amount: ₹${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
      </div>
    )
  }
  return null
}

interface CustomLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius?: number
  outerRadius?: number
  percent: number
}

const RADIAN = Math.PI / 180

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius = 0, outerRadius = 0, percent }: CustomLabelProps) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  // Only render label if percentage is large enough to avoid clutter
  if (percent * 100 < 5) {
    // Don't show label for slices smaller than 5%
    return null
  }

  return (
    <Text
      x={x}
      y={y}
      fill="white" // Label color
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize="8px" // Adjust font size
      fontWeight="bold" // Make it bold
    >
      {`${(percent * 100).toFixed(0)}%`}
    </Text>
  )
}

import { getAverageCategorySpend } from "@/lib/api"

export type CategorySpendSummaryWithExpenseFlag = {
  categoryId: string
  categoryName: string
  totalAmount: number
  expenseCount: number
  averageAmount: number
  is_expense: boolean
}

export function AnalyticsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [startDate, setStartDate] = useState<string>(() => formatDateForInput(startOfMonth(new Date())))
  const [endDate, setEndDate] = useState<string>(() => formatDateForInput(new Date()))

  // Category-wise average spend state
  const [averageSpendData, setAverageSpendData] = useState<CategorySpendSummaryWithExpenseFlag[]>([])
  const [averageSpendLoading, setAverageSpendLoading] = useState(false)
  const [averageSpendError, setAverageSpendError] = useState<string | null>(null)

  // ---- Summary calculations for selected period ----
  const totalIncome = useMemo(() => allExpenses.filter(e => e.type === "Income").reduce((sum, e) => sum + e.amount, 0), [allExpenses]);
  const totalExpense = useMemo(() => allExpenses.filter(e => e.type === "Need" || e.type === "Want").reduce((sum, e) => sum + e.amount, 0), [allExpenses]);
  const totalInvestment = useMemo(() => allExpenses.filter(e => e.type === "Investment").reduce((sum, e) => sum + e.amount, 0), [allExpenses]);
  const typeSpendingData = useMemo(() => {
    const totalsByType = { Need: 0, Want: 0, Investment: 0 };
    allExpenses.forEach(expense => {
      if (expense.type !== "Income") {
        totalsByType[expense.type] += expense.amount;
      }
    });

    return Object.entries(totalsByType).map(([name, value]) => ({ name, value }));
  }, [allExpenses]);

  // Currency formatter (reuse from dashboard)
  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

  // Fetch all expenses for a given date range with pagination handling
  const fetchAllExpensesForRange = useCallback(async (start: string, end: string) => {
    // Basic date validation
    if (!start || !end || new Date(start) > new Date(end)) {
      toast.error("Invalid date range selected.")
      return
    }

    setIsLoading(true)
    let fetchedExpenses: Expense[] = []
    let currentSkip = 0
    let hasMore = true

    try {
      while (hasMore) {
        const filters = {
          startDate: start,
          endDate: end,
          skip: currentSkip,
          limit: DATA_FETCH_LIMIT,
        }
        // Ensure getExpenses handles filters correctly
        const response = await getExpenses(filters)

        // Robust check for expected API response structure (array or object with items array)
        const expensesToAdd = Array.isArray(response)
          ? response
          : response?.items && Array.isArray(response.items)
            ? response.items
            : null

        if (expensesToAdd === null) {
          console.error("API did not return an array or expected object structure during expense fetch:", response)
          // Stop fetching if the first response is bad or if subsequent pages fail
          hasMore = false
          if (currentSkip === 0) {
            setAllExpenses([]) // Clear existing if first fetch failed
            toast.error("Failed to fetch expenses. Unexpected data format from server.")
          } else {
            toast.warning("Received unexpected data format on subsequent fetch page. Data might be incomplete.")
          }
        } else {
          fetchedExpenses = fetchedExpenses.concat(expensesToAdd)
          if (expensesToAdd.length < DATA_FETCH_LIMIT) {
            hasMore = false // Stop fetching if we received less than the limit
          } else {
            currentSkip += DATA_FETCH_LIMIT // Prepare for the next page
          }
        }
      }
      setAllExpenses(fetchedExpenses)
      if (fetchedExpenses.length > 0) {
        toast.success(`Workspaceed ${fetchedExpenses.length} expenses.`)
      } else if (!hasMore && currentSkip === 0) {
        // Check if fetch completed but returned 0 items initially
        toast.info("No expenses found for the selected period.")
      }
    } catch (error) {
      toast.error("Failed to fetch expenses for the report.")
      console.error("Error fetching expenses for report:", error)
      setAllExpenses([]) // Reset on error
    } finally {
      setIsLoading(false) // Ensure loading state is reset
    }
  }, []) // Dependency array is empty as it uses state setters and constants/imports

  // Fetch initial categories and expenses on component mount (after auth check)
  useEffect(() => {
    if (!authLoading) {
      const fetchInitialData = async () => {
        setIsLoading(true) // Set loading true at the start
        let categoriesLoaded = false
        try {
          // Fetch categories first
          const categoriesData = await getCategories()
          // Adjust based on actual API response structure for categories
          const categoryItems = Array.isArray(categoriesData)
            ? categoriesData
            : categoriesData?.items && Array.isArray(categoriesData.items)
              ? categoriesData.items
              : []
          setCategories(categoryItems)
          categoriesLoaded = true // Mark categories as loaded successfully

          // Fetch expenses using the initial date range state
          // Note: fetchAllExpensesForRange handles its own setIsLoading(false) in finally block
          await fetchAllExpensesForRange(startDate, endDate)
        } catch (error) {
          toast.error(`Failed to load initial data: ${categoriesLoaded ? "expenses" : "categories"}`)
          console.error("Error fetching initial data:", error)
          if (!categoriesLoaded) setCategories([])
          setAllExpenses([]) // Reset expenses if fetch failed
          setIsLoading(false) // Explicitly set loading false if initial fetch fails before expenses call
        }
      }
      fetchInitialData()
    }
  }, [authLoading, fetchAllExpensesForRange, startDate, endDate])

  // Fetch category-wise average spend whenever date range changes
  useEffect(() => {
    if (!authLoading && startDate && endDate) {
      setAverageSpendLoading(true)
      setAverageSpendError(null)
      getAverageCategorySpend(startDate, endDate)
        .then((data) => {
          setAverageSpendData(Array.isArray(data) ? data : [])
        })
        .catch((err) => {
          setAverageSpendError(err instanceof Error ? err.message : "Failed to fetch average spend data")
          setAverageSpendData([])
        })
        .finally(() => setAverageSpendLoading(false))
    }
  }, [authLoading, startDate, endDate])

  // Handle manual date range submission
  const handleDateChange = () => {
    // Prevent triggering multiple fetches if already loading or auth is pending
    if (!authLoading && !isLoading) {
      fetchAllExpensesForRange(startDate, endDate)
    }
  }

  // Handle predefined period selection from dropdown
  const handlePeriodSelect = (period: string) => {
    const now = new Date()
    let newStartDate: Date
    let newEndDate: Date = endOfDay(now) // Default end date can be today

    switch (period) {
      case "last_day":
        newStartDate = startOfDay(subDays(now, 1))
        newEndDate = endOfDay(subDays(now, 1))
        break
      case "this_week": // Assuming week starts on Monday
        newStartDate = startOfWeek(now, { weekStartsOn: 1 })
        newEndDate = endOfWeek(now, { weekStartsOn: 1 })
        break
      case "last_week": // Assuming week starts on Monday
        newStartDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
        newEndDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
        break
      case "this_month":
        newStartDate = startOfMonth(now)
        newEndDate = endOfMonth(now)
        break
      case "last_month":
        newStartDate = startOfMonth(subMonths(now, 1))
        newEndDate = endOfMonth(subMonths(now, 1))
        break
      case "last_6_months":
        // Includes current month + previous 5 full months
        newStartDate = startOfMonth(subMonths(now, 5))
        newEndDate = endOfMonth(now) // Could also be endOfDay(now) if preferred
        break
      case "this_year":
        newStartDate = startOfYear(now)
        newEndDate = endOfYear(now) // Could also be endOfDay(now)
        break
      case "last_year":
        newStartDate = startOfYear(subYears(now, 1))
        newEndDate = endOfYear(subYears(now, 1))
        break
      default:
        console.warn("Unknown period selected:", period)
        return // Do nothing if period key is unrecognized
    }

    const formattedStartDate = formatDateForInput(newStartDate)
    const formattedEndDate = formatDateForInput(newEndDate)

    setStartDate(formattedStartDate)
    setEndDate(formattedEndDate)

    // Immediately fetch data for the new range, avoiding trigger if already loading
    if (!authLoading && !isLoading) {
      fetchAllExpensesForRange(formattedStartDate, formattedEndDate)
    }
  }

  // Configuration for predefined period dropdown items
  const predefinedPeriods = [
    { key: "last_day", label: "Yesterday" },
    { key: "this_week", label: "This Week" },
    { key: "last_week", label: "Last Week" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "last_6_months", label: "Last 6 Months" },
    { key: "this_year", label: "This Year" },
    { key: "last_year", label: "Last Year" },
  ]

  // --- Report Data Processing: Category Spending (Memoized) ---
  const categorySpendingData = useMemo(() => {
    if (!allExpenses || allExpenses.length === 0 || !categories || categories.length === 0) {
      return []
    }

    const spendingMap = new Map<string, { name: string; value: number }>()

    // Initialize map with all fetched categories to ensure they appear even with 0 spend
    categories.forEach((cat: Category) => {
      // Ensure category object has the necessary properties
      if (cat && cat.id && cat.name) {
        spendingMap.set(cat.id, { name: cat.name, value: 0 })
      } else {
        console.warn("Category data missing id or name:", cat)
      }
    })

    // Define which expense types count as "spending" for this chart (e.g., exclude income, transfers)
    const spendingTypes: Array<Expense["type"]> = ["Need", "Want"] // Example: Only 'Need' and 'Want' types

    // Aggregate spending from expenses matching the spending types
    allExpenses.forEach((expense) => {
      // Skip expenses without a category ID or invalid amount
      if (!expense.category_id || typeof expense.amount !== "number" || expense.amount <= 0) return

      // Check if the expense type is included in spendingTypes
      if (spendingTypes.includes(expense.type)) {
        const categoryInfo = spendingMap.get(expense.category_id)
        if (categoryInfo) {
          categoryInfo.value += expense.amount
        } else {
          // Optional: Handle expenses whose category_id doesn't match any in the current `categories` state
          console.warn(`Expense category ID ${expense.category_id} not found in fetched categories list.`)
          // Could potentially group these under an "Other" category if needed
        }
      }
    })

    // Convert map to array, filter out categories with zero spending, and sort descending
    return Array.from(spendingMap.values())
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value) // Sort largest slice first for better visual hierarchy
  }, [allExpenses, categories]) // Recalculate only when expenses or categories change

  // Calculate total spending based on the filtered category data (Memoized)
  const totalSpending = useMemo(() => {
    return categorySpendingData.reduce((sum, entry) => sum + entry.value, 0)
  }, [categorySpendingData]) // Recalculate only when categorySpendingData changes

  // --- Report Data Processing: Spending Trend (Memoized) ---
  const spendingTrendData = useMemo(() => {
    if (!allExpenses || allExpenses.length === 0) {
      return []
    }

    const dailySpendingMap = new Map<string, number>()
    // Define which types count as spending for this chart (consistent with pie chart)
    const spendingTypes: Array<Expense["type"]> = ["Need", "Want", "Investment"] // Example: Only 'Need' and 'Want'

    // Aggregate spending by date (using the timestamp's date part)
    allExpenses.forEach((expense) => {
      // Validate required fields for trend analysis
      if (!expense.timestamp || typeof expense.amount !== "number" || expense.amount <= 0 || !expense.type) return

      if (spendingTypes.includes(expense.type)) {
        // Extract date part (YYYY-MM-DD) from the timestamp string
        const dateStr = expense.timestamp.substring(0, 10)
        dailySpendingMap.set(dateStr, (dailySpendingMap.get(dateStr) || 0) + expense.amount)
      }
    })

    // Convert map to array of { date, totalAmount } objects and sort by date
    return Array.from(dailySpendingMap.entries())
      .map(([date, totalAmount]) => ({ date, totalAmount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Ensure chronological order
  }, [allExpenses]) // Recalculate only when expenses change

  // --- Render Component ---
  return (
    <div className="flex min-h-screen flex-col bg-muted/40 dark:bg-background">
      {/* Navigation Components */}
      <MainNav />
      <MobileNav />
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Date Selection Card - now on top */}
        <Card className="dark:bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CalendarDays className="h-5 w-5 mr-2 text-primary" />
              Select Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Summary Cards for Selected Period (Responsive) */}
              <div className="col-span-2 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {/* Total Income */}
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <Skeleton className="h-8 w-[100px]" />
                      ) : (
                        <div className="text-2xl font-bold text-green-500">
                          {formatCurrency(totalIncome)}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Sum of all Income entries</p>
                    </CardContent>
                  </Card>
                  {/* Total Expense */}
                  <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
                      <DollarSign className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <Skeleton className="h-8 w-[100px]" />
                      ) : (
                        <div className="text-2xl font-bold text-red-500">
                          {formatCurrency(totalExpense)}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Needs + Wants</p>
                    </CardContent>
                  </Card>
                  {/* Total Investment */}
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
                      <PiggyBank className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <Skeleton className="h-8 w-[100px]" />
                      ) : (
                        <div className="text-2xl font-bold text-blue-500">
                          {formatCurrency(totalInvestment)}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Sum of all Investments</p>
                    </CardContent>
                  </Card>
                  {/* Balance */}
                  <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Balance</CardTitle>
                      <TrendingUp className="h-4 w-4 text-purple-500" />
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
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full dark:bg-input dark:border-border"
                      disabled={isLoading || authLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full dark:bg-input dark:border-border"
                      disabled={isLoading || authLoading}
                    />
                  </div>
                </div>
                <Button onClick={handleDateChange} disabled={isLoading || authLoading} className="w-full">
                  {isLoading ? (
                    "Loading..."
                  ) : (
                    "Load Report Data"
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodDropdown">Quick Period</Label>
                <select
                  id="periodDropdown"
                  className="w-full dark:bg-input dark:border-border rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  onChange={(e) => {
                    if (e.target.value) handlePeriodSelect(e.target.value);
                  }}
                  disabled={isLoading || authLoading}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a period
                  </option>
                  {predefinedPeriods.map((period) => (
                    <option key={period.key} value={period.key}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Charts Grid - Responsive Layout */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {/* Category Spending Pie Chart Card */}
          <Card className="dark:bg-card overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-primary" />
                Spending by Category
              </CardTitle>
              {/* Display total spending below the title if available */}
              {!isLoading && totalSpending > 0 && (
                <p className="text-sm text-muted-foreground">
                  Total Spent: ₹
                  {totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-4 overflow-visible w-full max-w-full" style={{ minHeight: 320 }}>
              <div className="w-full flex justify-center items-center">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[220px] w-full">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-muted-foreground">Loading chart data...</p>
                    </div>
                  </div>
                ) : categorySpendingData.length > 0 ? (
                  <div className="w-full flex flex-col items-center">
                    {/* Add extra padding at the top on mobile to prevent cutting off */}
                    <div className="pt-6 sm:pt-0 w-full">
                      <ResponsiveContainer
                        width="100%"
                        height={window.innerWidth < 640 ? 260 : 300}
                        className="max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl w-full"
                      >
                        <PieChart margin={{ top: 30, right: 0, bottom: 5, left: 0 }}>
                          <Pie
                            data={categorySpendingData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={window.innerWidth < 640 ? 80 : 110}
                            innerRadius={window.innerWidth < 640 ? 48 : 70}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            paddingAngle={1}
                            animationDuration={750}
                            animationBegin={0}
                          >
                            {categorySpendingData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={1}
                                style={{ outline: "none" }}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(200, 200, 200, 0.1)" }} />
                          {/* Hide the Recharts legend on mobile to avoid layout issues */}
                          <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{
                              paddingTop: 20,
                              fontSize: 14,
                              overflowX: 'auto',
                              width: '100%',
                              display: window.innerWidth < 640 ? 'none' : 'block'
                            }}
                            iconSize={10}
                            iconType="circle"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Custom scrollable legend for small screens - two rows if needed */}
                    <div className="w-full mt-2 md:hidden overflow-x-auto scrollbar-thin">
                      <div className="grid grid-cols-2 gap-2 px-2 pb-2 min-w-max sm:flex sm:flex-row sm:space-x-4">
                        {categorySpendingData.map((entry, idx) => (
                          <div key={`legend-${idx}`} className="flex items-center whitespace-nowrap">
                            <div
                              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="text-xs">
                              {entry.name} (₹{entry.value.toLocaleString()})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Show category values in a separate scrollable area for mobile */}
                    <div className="w-full mt-1 md:hidden overflow-x-auto scrollbar-thin">
                      <div className="flex flex-row space-x-4 min-w-max px-2 pb-2">
                        {categorySpendingData.slice(0, 3).map((entry, idx) => (
                          <div key={`value-${idx}`} className="text-xs text-center">
                            <span className="font-medium" style={{ color: COLORS[idx % COLORS.length] }}>
                              • {entry.name}: ₹{entry.value.toLocaleString()}
                            </span>
                          </div>
                        ))}
                        {categorySpendingData.length > 3 && (
                          <div className="text-xs text-center">
                            <span className="font-medium">• + {categorySpendingData.length - 3} more</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[220px] w-full text-center text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 opacity-50 mb-3 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
                      />
                    </svg>
                    <p className="text-md font-medium">No Spending Data</p>
                    <p className="text-sm opacity-80 mt-1">No spending recorded for the selected period.</p>
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link href="/expenses?action=add">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Transaction
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Type Spending Pie Chart Card */}
          <Card className="dark:bg-card overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-primary" />
                Spending by Type
              </CardTitle>
              {!isLoading && totalSpending > 0 && (
                <p className="text-sm text-muted-foreground">
                  Total Spent: ₹
                  {totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-4 overflow-x-auto w-full max-w-full" style={{ minHeight: 220 }}>
              <div className="w-full flex justify-center items-center">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[220px] w-full">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-muted-foreground">Loading chart data...</p>
                    </div>
                  </div>
                ) : typeSpendingData.length > 0 ? (
                  <div className="w-full flex flex-col items-center">
                    <ResponsiveContainer
                      width="100%"
                      height={window.innerWidth < 640 ? 220 : 300}
                      className="max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl w-full"
                    >
                      <PieChart>
                        <Pie
                          data={typeSpendingData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={window.innerWidth < 640 ? 80 : 110}
                          innerRadius={window.innerWidth < 640 ? 48 : 70}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          paddingAngle={1}
                          animationDuration={750}
                          animationBegin={0}
                        >
                          {typeSpendingData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                              stroke={COLORS[index % COLORS.length]}
                              strokeWidth={1}
                              style={{ outline: "none" }}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(200, 200, 200, 0.1)" }} />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                          wrapperStyle={{
                            paddingTop: 20,
                            fontSize: window.innerWidth < 640 ? 12 : 14,
                            overflowX: 'auto',
                            width: '100%'
                          }}
                          iconSize={10}
                          iconType="circle"
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Custom scrollable legend for small screens */}
                    <div className="w-full mt-4 md:hidden overflow-x-auto scrollbar-thin">
                      <div className="flex flex-row space-x-4 min-w-max px-2 pb-2">
                        {typeSpendingData.map((entry, idx) => (
                          <div key={`legend-${idx}`} className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="text-xs whitespace-nowrap">
                              {entry.name} (₹{entry.value.toLocaleString()})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[220px] w-full text-center text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 opacity-50 mb-3 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
                      />
                    </svg>
                    <p className="text-md font-medium">No Spending Data</p>
                    <p className="text-sm opacity-80 mt-1">No spending recorded for the selected period.</p>
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link href="/expenses?action=add">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Transaction
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>


        </div>
        {/* Spending Trend Line Chart Card */}
        <Card className="dark:bg-card overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary" />
              Spending Trend
            </CardTitle>
            {!isLoading && spendingTrendData.length <= 1 && (
              <p className="text-sm text-muted-foreground">Need at least two days with spending for a trend line.</p>
            )}
          </CardHeader>
          <CardContent className="h-[300px] sm:h-[350px] pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground">Loading chart data...</p>
                </div>
              </div>
            ) : spendingTrendData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendingTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(dateStr) => format(new Date(dateStr), "MMM d")}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 12 }}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    tickFormatter={(value) => `₹${value.toLocaleString()}`}
                    width={70}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length && payload[0] && typeof payload[0].value === "number") {
                        return (
                          <div className="p-3 bg-background border rounded shadow-sm text-sm dark:bg-popover dark:border-border">
                            <p className="font-semibold">{format(new Date(label), "PPP")}</p>
                            <p className="text-muted-foreground mt-1">{`Spending: ₹${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                    cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
                  />
                  {resolvedTheme === "dark" ? (
                    <Line
                      type="monotone"
                      dataKey="totalAmount"
                      stroke="#60a5fa"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#60a5fa", strokeWidth: 1, stroke: "#60a5fa" }}
                      activeDot={{
                        r: 6,
                        strokeWidth: 2,
                        fill: "#18181b",
                        stroke: "#60a5fa",
                      }}
                      name="Daily Spending"
                      connectNulls={true}
                      isAnimationActive={true}
                      animationDuration={750}
                      animationBegin={0}
                    />
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="totalAmount"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#2563eb", strokeWidth: 1, stroke: "#2563eb" }}
                      activeDot={{
                        r: 6,
                        strokeWidth: 2,
                        fill: "#fff",
                        stroke: "#2563eb",
                      }}
                      name="Daily Spending"
                      connectNulls={true}
                      isAnimationActive={true}
                      animationDuration={750}
                      animationBegin={0}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 opacity-50 mb-3 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 1.085-1.085-1.085m0 0l-1 1.085-1.085-1.085m0 0l-1 1.085-1.085-1.085m0 0l-1 1.085-1.085-1.085M12 4.5v6.75m0 0l1.5-1.5m-1.5 1.5L10.5 9.75"
                  />
                </svg>
                <p className="text-md font-medium">Not Enough Data for Trend</p>
                <p className="text-sm opacity-80 mt-1">
                  Requires spending on at least two different days in the selected period.
                </p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/expenses?action=add">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Transaction
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        {/* End Charts Grid */}
        {/* Category-wise Average Spend Analytics */}
        <Card className="dark:bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Category-wise Average Spend</CardTitle>
          </CardHeader>
          <CardContent>
            {averageSpendLoading ? (
              <div className="flex items-center justify-center h-32">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : averageSpendError ? (
              <div className="text-red-500 text-sm text-center py-4">{averageSpendError}</div>
            ) : averageSpendData.length === 0 ? (
              <div className="text-muted-foreground text-center py-4">
                No category spend data found for the selected period.
              </div>
            ) : (
              <div className="space-y-8">
                {/* Expense Categories Table */}
                <div>
                  <h3 className="font-semibold mb-2 text-base">Expense Categories</h3>
                  {averageSpendData.filter((row) => row.is_expense).length === 0 ? (
                    <div className="text-muted-foreground text-center py-2">No expense category data.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border rounded-md">
                        <thead>
                          <tr className="bg-muted dark:bg-muted/30">
                            <th className="px-4 py-2 text-left">Category</th>
                            <th className="px-4 py-2 text-right">Total Spent (₹)</th>
                            <th className="px-4 py-2 text-right"># Expenses</th>
                            <th className="px-4 py-2 text-right">Avg. Spend (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {averageSpendData
                            .filter((row) => row.is_expense)
                            .map((row) => (
                              <tr key={row.categoryId} className="border-b last:border-b-0">
                                <td className="px-4 py-2">{row.categoryName}</td>
                                <td className="px-4 py-2 text-right">
                                  {row.totalAmount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="px-4 py-2 text-right">{row.expenseCount}</td>
                                <td className="px-4 py-2 text-right">
                                  {row.averageAmount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {/* Income Categories Table */}
                <div>
                  <h3 className="font-semibold mb-2 text-base">Income Categories</h3>
                  {averageSpendData.filter((row) => !row.is_expense).length === 0 ? (
                    <div className="text-muted-foreground text-center py-2">No income category data.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border rounded-md">
                        <thead>
                          <tr className="bg-muted dark:bg-muted/30">
                            <th className="px-4 py-2 text-left">Category</th>
                            <th className="px-4 py-2 text-right">Total Received (₹)</th>
                            <th className="px-4 py-2 text-right"># Entries</th>
                            <th className="px-4 py-2 text-right">Avg. Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {averageSpendData
                            .filter((row) => !row.is_expense)
                            .map((row) => (
                              <tr key={row.categoryId} className="border-b last:border-b-0">
                                <td className="px-4 py-2">{row.categoryName}</td>
                                <td className="px-4 py-2 text-right">
                                  {row.totalAmount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="px-4 py-2 text-right">{row.expenseCount}</td>
                                <td className="px-4 py-2 text-right">
                                  {row.averageAmount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* --- Category-wise Spend Bar Graph --- */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Category-wise Spend (Bar Graph)</CardTitle>
          </CardHeader>
          <CardContent>
            {averageSpendData && averageSpendData.filter(row => row.is_expense).length > 0 ? (
              <div>
                {(() => {
                  const expenseData = [...averageSpendData.filter(row => row.is_expense)].sort((a, b) => b.totalAmount - a.totalAmount)
                  const categoryCount = expenseData.length
                  // Dynamic height: 48px per category, min 250, max 700
                  const chartHeight = Math.min(Math.max(categoryCount * 48, 250), 700)
                  // Bar size and font size adjustments
                  const barSize = categoryCount > 12 ? 18 : 28
                  const labelFontSize = categoryCount > 12 ? 11 : 14
                  // Theme-aware colors
                  const labelColor = isDark ? "#fff" : "#333";
                  const axisColor = isDark ? "#ccc" : "#333";
                  const gridColor = isDark ? "rgba(255,255,255,0.12)" : "#e0e0e0";
                  return (
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart
                        data={expenseData}
                        layout="vertical"
                        margin={{ top: 16, right: 32, left: 0, bottom: 16 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          type="number"
                          tickFormatter={value => `₹${value.toLocaleString()}`}
                          tick={{ fill: axisColor, fontSize: labelFontSize }}
                          axisLine={{ stroke: axisColor }}
                          tickLine={{ stroke: axisColor }}
                        />
                        <YAxis
                          dataKey="categoryName"
                          type="category"
                          width={120}
                          tick={{ fill: axisColor, fontSize: labelFontSize }}
                          axisLine={{ stroke: axisColor }}
                          tickLine={{ stroke: axisColor }}
                        />
                        <Tooltip
                          contentStyle={{ background: isDark ? "#23272e" : "#fff", border: `1px solid ${isDark ? "#444" : "#eee"}` }}
                          labelStyle={{ color: isDark ? "#fff" : "#333" }}
                          itemStyle={{ color: isDark ? "#fff" : "#333" }}
                          formatter={(value: number) => `₹${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        />
                        <Legend wrapperStyle={{ color: axisColor }} />
                        <Bar
                          dataKey="totalAmount"
                          name="Total Spend"
                          radius={[8, 8, 8, 8]}
                          barSize={barSize}
                          label={({ x, y, width, value }) => (
                            <text
                              x={x + width + 8}
                              y={y + barSize / 2}
                              fill={labelColor}
                              fontWeight={600}
                              fontSize={labelFontSize}
                              alignmentBaseline="middle"
                            >
                              ₹{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </text>
                          )}
                        >
                          {expenseData.map((entry, idx) => (
                            <Cell key={`cell-${entry.categoryId}`} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })()}
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-2">No expense data to display.</div>
            )}
          </CardContent>
        </Card>

      </div>

    </div> /* End Main Container */
  )
}
