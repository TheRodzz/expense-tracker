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
import { Card, CardContent } from "@/components/ui/card"
import { deletePaymentMethod, type PaymentMethodData } from "@/lib/api"
import { Edit, MoreHorizontal, Trash2 } from "lucide-react"

interface PaymentMethodsListProps {
  paymentMethods: PaymentMethodData[]
  onEdit: (paymentMethod: PaymentMethodData) => void
  onRefresh: () => void
}

export function PaymentMethodsList({ paymentMethods, onEdit, onRefresh }: PaymentMethodsListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethodData | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!paymentMethodToDelete) return

    try {
      await deletePaymentMethod(paymentMethodToDelete.id!)
      toast.success("Payment method deleted successfully")
      onRefresh()
      setDeleteError(null)
    } catch (error) {
      if (error instanceof Error && error.message.includes("409")) {
        setDeleteError("Cannot delete this payment method because it's being used by existing expenses.")
      } else {
        setDeleteError("Failed to delete payment method")
        toast.error("Failed to delete payment method")
      }
    }
  }

  const confirmDelete = (paymentMethod: PaymentMethodData) => {
    setPaymentMethodToDelete(paymentMethod)
    setDeleteDialogOpen(true)
    setDeleteError(null)
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentMethods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No payment methods found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentMethods.map((paymentMethod: PaymentMethodData) => (
                    <TableRow key={paymentMethod.id!}>
                      <TableCell>{paymentMethod.name}</TableCell>
                      <TableCell>{paymentMethod.is_expense ? "Expense" : "Income"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(paymentMethod)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => confirmDelete(paymentMethod)}
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
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the payment method &quot;{paymentMethodToDelete?.name}&quot;.
              {!deleteError && " This action cannot be undone."}
            </AlertDialogDescription>
            {deleteError && <div className="mt-2 text-sm text-red-500">{deleteError}</div>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
