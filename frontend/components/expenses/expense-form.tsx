"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { type ExpenseFormData, createExpense, updateExpense, getCategories, getPaymentMethods } from "@/lib/api"
import { cn } from "@/lib/utils"
import Link from "next/link"

// Define the Expense type by extending ExpenseFormData and adding an ID
type Expense = ExpenseFormData & { id: string }

// Define types based on the provided data structure
interface Category {
  id: string
  name: string
  is_expense: boolean
  // Add other fields if necessary
}

interface PaymentMethod {
  id: string
  name: string
  is_expense: boolean
  // Add other fields if necessary
}

interface ExpenseFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  expenseToEdit?: Expense
}

export function ExpenseForm({ isOpen, onClose, onSuccess, expenseToEdit }: ExpenseFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [filteredPaymentMethods, setFilteredPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm<ExpenseFormData>({
    defaultValues: {
      type: "Need",
      amount: 0,
      description: "",
      category_id: "",
      payment_method_id: "",
      timestamp: new Date().toISOString().split("T")[0],
    },
    mode: "onChange",
  })

  const expenseType = watch("type")
  const currentCategoryId = watch("category_id") // Watch current selections
  const currentPaymentMethodId = watch("payment_method_id")
  const amount = watch("amount")

  useEffect(() => {
    if (isOpen) {
      fetchFormData()

      if (expenseToEdit) {
        setValue("type", expenseToEdit.type)
        setValue("amount", expenseToEdit.amount)
        setValue("description", expenseToEdit.description)
        setValue("category_id", expenseToEdit.category_id)
        setValue("payment_method_id", expenseToEdit.payment_method_id)
        setValue("timestamp", new Date(expenseToEdit.timestamp).toISOString().split("T")[0])
      } else {
        reset({
          type: "Need",
          amount: 0,
          description: "",
          category_id: "",
          payment_method_id: "",
          timestamp: new Date().toISOString().split("T")[0],
        })
      }
    }
  }, [isOpen, expenseToEdit, setValue, reset])

  // Effect to filter categories and payment methods based on expenseType
  useEffect(() => {
    const targetIsExpense = expenseType !== "Income"

    const newFilteredCategories = categories.filter((c) => c.is_expense === targetIsExpense)
    setFilteredCategories(newFilteredCategories)

    const newFilteredPaymentMethods = paymentMethods.filter((pm) => pm.is_expense === targetIsExpense)
    setFilteredPaymentMethods(newFilteredPaymentMethods)

    // Reset category and payment method if the current selection is no longer valid or if type changed
    // Check if the current selection exists in the new filtered list
    const isCurrentCategoryValid = newFilteredCategories.some((c) => c.id === currentCategoryId)
    const isCurrentPaymentMethodValid = newFilteredPaymentMethods.some((pm) => pm.id === currentPaymentMethodId)

    if (!isCurrentCategoryValid) {
      setValue("category_id", "", { shouldValidate: true })
    }
    if (!isCurrentPaymentMethodValid) {
      setValue("payment_method_id", "", { shouldValidate: true })
    }
  }, [expenseType, categories, paymentMethods, setValue, currentCategoryId, currentPaymentMethodId])

  const fetchFormData = async () => {
    try {
      setIsLoading(true)
      // Assuming getCategories/getPaymentMethods return { items: [], total: n } or just []
      // We need all items for the dropdowns.
      const [categoriesResponse, paymentMethodsResponse] = await Promise.all([
        getCategories(), // Fetch all categories
        getPaymentMethods(), // Fetch all payment methods
      ])

      // Handle both potential response structures
      const categoriesData: Category[] = Array.isArray(categoriesResponse)
        ? categoriesResponse
        : categoriesResponse?.items || []
      const paymentMethodsData: PaymentMethod[] = Array.isArray(paymentMethodsResponse)
        ? paymentMethodsResponse
        : paymentMethodsResponse?.items || []

      setCategories(categoriesData)
      setPaymentMethods(paymentMethodsData)
    } catch {
      toast.error("Failed to load form data (categories/methods)")
      setCategories([]) // Clear on error
      setPaymentMethods([]) // Clear on error
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      setIsSubmitting(true)

      // Format the timestamp to include time
      const date = new Date(data.timestamp)
      data.timestamp = date.toISOString()

      if (expenseToEdit) {
        await updateExpense(expenseToEdit.id, data)
        toast.success("Transaction updated successfully")
      } else {
        await createExpense(data)
        toast.success("Transaction added successfully")
      }

      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get the appropriate color based on transaction type
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Income":
        return "text-green-500 border-green-500"
      case "Need":
        return "text-red-500 border-red-500"
      case "Want":
        return "text-orange-500 border-orange-500"
      case "Investment":
        return "text-blue-500 border-blue-500"
      default:
        return ""
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className={cn("px-2 py-1 rounded-md border text-sm mr-2", getTypeColor(expenseType))}>
              {expenseType}
            </span>
            {expenseToEdit ? "Edit" : "Add"} Transaction
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading form data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="transactionType">Transaction Type</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" type="button">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="sr-only">Transaction type help</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          <strong>Need:</strong> Essential expenses
                          <br />
                          <strong>Want:</strong> Non-essential expenses
                          <br />
                          <strong>Investment:</strong> Future growth
                          <br />
                          <strong>Income:</strong> Money received
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={expenseType}
                  onValueChange={(value) =>
                    setValue("type", value as "Need" | "Want" | "Investment" | "Income", { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="transactionType" className={cn(getTypeColor(expenseType))}>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Need" className="text-red-500">
                      Need
                    </SelectItem>
                    <SelectItem value="Want" className="text-orange-500">
                      Want
                    </SelectItem>
                    <SelectItem value="Investment" className="text-blue-500">
                      Investment
                    </SelectItem>
                    <SelectItem value="Income" className="text-green-500">
                      Income
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="flex items-center justify-between">
                    <span>Amount</span>
                    {amount > 0 && (
                      <span className={cn("text-xs font-normal", getTypeColor(expenseType))}>
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(amount)}
                      </span>
                    )}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    className={cn(errors.amount && "border-red-500")}
                    {...register("amount", {
                      required: "Amount is required",
                      valueAsNumber: true,
                      min: { value: 0, message: "Amount must be positive" },
                    })}
                  />
                  {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    className={cn(errors.timestamp && "border-red-500")}
                    {...register("timestamp", { required: "Date is required" })}
                  />
                  {errors.timestamp && <p className="text-xs text-red-500">{errors.timestamp.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className={cn(errors.description && "border-red-500")}
                  placeholder="What was this transaction for?"
                  {...register("description", { required: "Description is required" })}
                />
                {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  onValueChange={(value) => setValue("category_id", value, { shouldValidate: true })}
                  value={currentCategoryId} // Use watched value
                >
                  <SelectTrigger className={cn(errors.category_id && "border-red-500")}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-muted-foreground">No matching categories found</div>
                    )}
                  </SelectContent>
                </Select>
                {errors.category_id && <p className="text-xs text-red-500">{errors.category_id.message}</p>}
                {filteredCategories.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    No {expenseType === "Income" ? "income" : "expense"} categories available.
                    <Link href="/categories" className="ml-1 underline">
                      Add one
                    </Link>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  onValueChange={(value) => setValue("payment_method_id", value, { shouldValidate: true })}
                  value={currentPaymentMethodId} // Use watched value
                >
                  <SelectTrigger className={cn(errors.payment_method_id && "border-red-500")}>
                    <SelectValue placeholder="Select a payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPaymentMethods.length > 0 ? (
                      filteredPaymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No matching payment methods found
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {errors.payment_method_id && <p className="text-xs text-red-500">{errors.payment_method_id.message}</p>}
                {filteredPaymentMethods.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    No {expenseType === "Income" ? "income" : "expense"} payment methods available.
                    <Link href="/payment-methods" className="ml-1 underline">
                      Add one
                    </Link>
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isValid || !isDirty}
                className={cn(getTypeColor(expenseType), "transition-all")}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
