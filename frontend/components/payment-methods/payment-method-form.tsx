"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { createPaymentMethod, updatePaymentMethod, type PaymentMethodData } from "@/lib/api"

interface PaymentMethodFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  paymentMethodToEdit?: PaymentMethodData
}

export function PaymentMethodForm({ isOpen, onClose, onSuccess, paymentMethodToEdit }: PaymentMethodFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentMethodData>({
    defaultValues: {
      name: "",
      is_expense: true,
    },
  })

  const isExpense = watch("is_expense")

  useEffect(() => {
    if (isOpen) {
      if (paymentMethodToEdit) {
        reset({
          name: paymentMethodToEdit.name,
          is_expense: paymentMethodToEdit.is_expense,
        })
      } else {
        reset({
          name: "",
          is_expense: true,
        })
      }
    }
  }, [isOpen, paymentMethodToEdit, reset])

  const onSubmit = async (data: PaymentMethodData) => {
    try {
      setIsSubmitting(true)
      const payload = { name: data.name, is_expense: data.is_expense }

      if (paymentMethodToEdit && paymentMethodToEdit.id) {
        await updatePaymentMethod(paymentMethodToEdit.id, payload)
        toast.success("Payment method updated successfully")
      } else {
        await createPaymentMethod(payload)
        toast.success("Payment method added successfully")
      }

      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save payment method")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
          reset({ name: "", is_expense: true })
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{paymentMethodToEdit ? "Edit" : "Add"} Payment Method</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Payment Method Name</Label>
              <Input id="name" {...register("name", { required: "Payment method name is required" })} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message as string}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_expense"
                checked={isExpense}
                onCheckedChange={(checked: boolean) => setValue("is_expense", checked, { shouldValidate: true })}
              />
              <Label htmlFor="is_expense">{isExpense ? "Expense Method" : "Income Method"}</Label>
            </div>
            <input type="hidden" {...register("is_expense")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
      </DialogContent>
    </Dialog>
  )
}
