"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { deleteExpense, type Expense } from "@/lib/api"
import { Edit, MoreHorizontal, Trash2, ArrowLeft, ArrowRight, Loader2, RefreshCw, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"

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

interface ExpensesListProps {
  expenses: Expense[]
  categories: Category[] // Use defined Category type
  paymentMethods: PaymentMethod[] // Use defined PaymentMethod type
  onEdit: (expense: Expense) => void // Use imported Expense type
  onRefresh: () => void
  currentPage: number
  pageSize: number
  totalCount: number
  onPageChange: (newPage: number) => void
  isTotalLoading?: boolean
}

export function ExpensesList({
  expenses,
  categories,
  paymentMethods,
  onEdit,
  onRefresh,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  isTotalLoading,
}: ExpensesListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null) // Use imported Expense type
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "Unknown"
  }

  const getPaymentMethodName = (paymentMethodId: string) => {
    const method = paymentMethods.find((m) => m.id === paymentMethodId)
    return method ? method.name : "Unknown"
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

  const handleDelete = async () => {
    if (!expenseToDelete) return

    try {
      setIsDeleting(true)
      await deleteExpense(expenseToDelete.id)
      toast.success("Transaction deleted successfully")
      onRefresh()
    } catch {
      toast.error("Failed to delete transaction")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setExpenseToDelete(null)
    }
  }

  const confirmDelete = (expense: Expense) => {
    // Use imported Expense type
    setExpenseToDelete(expense)
    setDeleteDialogOpen(true)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  // Get appropriate color for transaction type
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Income":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      case "Need":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      case "Want":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
      case "Investment":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
    }
  }

  // Get appropriate text color for amount
  const getAmountColor = (type: string) => {
    switch (type) {
      case "Income":
        return "text-green-500"
      case "Need":
        return "text-red-500"
      case "Want":
        return "text-orange-500"
      case "Investment":
        return "text-blue-500"
      default:
        return ""
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="text-sm text-muted-foreground">
              {isTotalLoading ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Calculating total...
                </div>
              ) : (
                <span>
                  Showing {expenses.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{" "}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount} transactions
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
          <div className="rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Payment Method</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="rounded-full bg-muted p-3">
                          <Receipt className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="text-muted-foreground">No transactions found</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense: Expense) => (
                    <TableRow
                      key={expense.id}
                      className="group hover:bg-muted/50 cursor-pointer"
                      onClick={() => onEdit(expense)}
                    >
                      <TableCell>{formatDate(expense.timestamp)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{expense.description}</div>
                        <div className="md:hidden text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                          <span>{getCategoryName(expense.category_id)}</span>
                          <span>•</span>
                          <span>{getPaymentMethodName(expense.payment_method_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{getCategoryName(expense.category_id)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getPaymentMethodName(expense.payment_method_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-normal", getTypeColor(expense.type))}>
                          {expense.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("text-right font-medium", getAmountColor(expense.type))}>
                        {expense.type === "Income" ? "+" : "-"}
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(expense)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => confirmDelete(expense)}
                              className="text-red-500 focus:text-red-500"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex items-center justify-between border-t p-4">
            <div className="text-sm text-muted-foreground flex items-center">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              {isTotalLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || isTotalLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isTotalLoading}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600" disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
